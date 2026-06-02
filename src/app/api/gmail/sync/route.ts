import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { llm } from "@/lib/llm"

/**
 * Refresh a Gmail access token using the stored refresh_token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
} | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error("Token refresh failed:", data)
    return null
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  }
}

/**
 * Get or refresh a valid access token for a connection
 */
async function getValidAccessToken(connection: any): Promise<string | null> {
  // Check if current token is still valid (with 5 min buffer)
  const now = new Date()
  const expiry = new Date(connection.token_expires_at)
  const bufferMs = 5 * 60 * 1000

  if (expiry.getTime() - bufferMs > now.getTime()) {
    return connection.access_token
  }

  // Token expired or about to - refresh it
  const refreshed = await refreshAccessToken(connection.refresh_token)
  if (!refreshed) return null

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)

  await getSupabaseAdmin()
    .from("email_connections")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)

  return refreshed.access_token
}

/**
 * Fetch emails from Gmail matching casting agency patterns
 */
async function fetchCastingEmails(
  accessToken: string,
  cursor?: string,
  maxResults: number = 50
): Promise<{
  messages: any[]
  historyId?: string
}> {
  const baseUrl = "https://gmail.googleapis.com/gmail/v1/users/me"

  // Search for casting-related emails from any sender
  // Matches Japanese casting keywords + English equivalents
  const fullQuery = `(audition OR casting OR self-tape OR callback OR 出演 OR オーディション OR キャスティング OR 撮影) newer_than:30d`

  // If we have a cursor (historyId), use history API for incremental sync
  // Otherwise, do a full search
  let messageIds: string[] = []
  let nextHistoryId: string | undefined

  if (cursor) {
    // Incremental sync via history API
    try {
      const historyRes = await fetch(
        `${baseUrl}/history?startHistoryId=${cursor}&historyTypes=messageAdded`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      const historyData = await historyRes.json()

      if (historyData.history) {
        for (const entry of historyData.history) {
          if (entry.messagesAdded) {
            for (const msg of entry.messagesAdded) {
              messageIds.push(msg.message.id)
            }
          }
        }
      }

      nextHistoryId = historyData.historyId
    } catch (err) {
      console.error("History API failed, falling back to search:", err)
      // Fall through to search
    }
  }

  // Full search (first sync or fallback)
  if (messageIds.length === 0) {
    const searchRes = await fetch(
      `${baseUrl}/messages?q=${encodeURIComponent(fullQuery)}&maxResults=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    const searchData = await searchRes.json()

    if (searchData.messages) {
      messageIds = searchData.messages.map((m: any) => m.id)
    }

    // Get the current historyId for future incremental syncs
    const profileRes = await fetch(`${baseUrl}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json()
    nextHistoryId = profile.historyId
  }

  // Fetch full message details
  const messages: any[] = []
  for (const msgId of messageIds.slice(0, maxResults)) {
    try {
      const msgRes = await fetch(
        `${baseUrl}/messages/${msgId}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      const msgData = await msgRes.json()
      messages.push(msgData)
    } catch (err) {
      console.error(`Failed to fetch message ${msgId}:`, err)
    }
  }

  return { messages, historyId: nextHistoryId }
}

/**
 * Extract text content from Gmail message payload
 */
function extractEmailContent(payload: any): { text: string; html: string } {
  let text = ""
  let html = ""

  function traverseParts(parts: any[]) {
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = Buffer.from(part.body.data, "base64url").toString("utf8")
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = Buffer.from(part.body.data, "base64url").toString("utf8")
      } else if (part.parts) {
        traverseParts(part.parts)
      }
    }
  }

  if (payload.parts) {
    traverseParts(payload.parts)
  } else if (payload.body?.data) {
    text = Buffer.from(payload.body.data, "base64url").toString("utf8")
  }

  return { text, html }
}

/**
 * Extract headers from Gmail message
 */
function extractHeaders(payload: any): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const h of payload.headers || []) {
    headers[h.name.toLowerCase()] = h.value
  }
  return headers
}

/**
 * POST /api/gmail/sync
 * Triggered by user clicking "Sync Emails" or by cron job
 */
export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const body = await request.json().catch(() => ({}))
    const { user_id, connection_id, force_full = false } = body

    // Get the email connection
    let query = supabaseAdmin
      .from("email_connections")
      .select("*")
      .eq("is_active", true)

    if (connection_id) {
      query = query.eq("id", connection_id)
    } else if (user_id) {
      query = query.eq("user_id", user_id)
    }

    const { data: connections, error: connError } = await query

    if (connError || !connections?.length) {
      return NextResponse.json(
        { error: "No active email connections found" },
        { status: 404 }
      )
    }

    const results: any[] = []

    for (const connection of connections) {
      // Load user's trusted casting sources
      let trustedSources: string[] = []
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("casting_sources")
        .eq("id", connection.user_id)
        .single()
      if (profile?.casting_sources && Array.isArray(profile.casting_sources)) {
        trustedSources = profile.casting_sources as string[]
      }

      // Get valid access token
      const accessToken = await getValidAccessToken(connection)
      if (!accessToken) {
        results.push({
          connection_id: connection.id,
          status: "error",
          error: "Failed to refresh access token",
        })
        // Mark connection as inactive
        await supabaseAdmin
          .from("email_connections")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", connection.id)
        continue
      }

      // Fetch emails
      const cursor = force_full ? undefined : connection.sync_cursor || undefined
      const { messages, historyId } = await fetchCastingEmails(
        accessToken,
        cursor,
        50 // Max 50 emails per sync
      )

      let inserted = 0
      let skipped = 0

      for (const msg of messages) {
        if (!msg.payload) {
          skipped++
          continue
        }

        const headers = extractHeaders(msg.payload)
        const { text, html } = extractEmailContent(msg.payload)

        const gmailId = msg.id
        const fromAddress = headers.from || ""
        const fromName = fromAddress.match(/^(.*?)</)?.[1]?.trim() || fromAddress
        const toAddress = headers.to || connection.email_address
        const subject = headers.subject || "(No subject)"
        const receivedAt = headers.date
          ? new Date(headers.date).toISOString()
          : new Date().toISOString()

        // Check for duplicate (same gmail_message_id)
        const { data: existing } = await supabaseAdmin
          .from("casting_emails")
          .select("id")
          .eq("user_id", connection.user_id)
          .eq("gmail_message_id", gmailId)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Check if sender is a trusted casting source (from profile settings)
        const senderEmail = fromAddress.match(/<(.+?)>/)?.[1]?.toLowerCase() || fromAddress.toLowerCase()
        const senderDomain = senderEmail.split("@")[1] || ""
        const isTrustedSource = trustedSources.some((src: string) => {
          const s = src.toLowerCase()
          return senderEmail.includes(s) || senderDomain.includes(s)
        })

        // Detect if it's likely a casting email via keywords OR trusted source
        const lowerSubject = subject.toLowerCase()
        const lowerBody = text.toLowerCase()
        const keywordMatch =
          lowerSubject.includes("audition") ||
          lowerSubject.includes("casting") ||
          lowerSubject.includes("self-tape") ||
          lowerSubject.includes("self tape") ||
          lowerSubject.includes("callback") ||
          lowerSubject.includes("role") ||
          lowerSubject.includes("submission") ||
          lowerSubject.includes("availability") ||
          lowerSubject.includes("shoot") ||
          lowerSubject.includes("talent") ||
          lowerSubject.includes("出演") ||
          lowerSubject.includes("オーディション") ||
          lowerSubject.includes("キャスティング") ||
          lowerSubject.includes("撮影") ||
          lowerBody.includes("audition") ||
          lowerBody.includes("self-tape") ||
          lowerBody.includes("casting") ||
          lowerBody.includes("callback") ||
          lowerBody.includes("撮影日") ||
          lowerBody.includes("出演依頼")

        const isCasting = isTrustedSource || keywordMatch

        // Insert into database
        const { error: insertError } = await supabaseAdmin
          .from("casting_emails")
          .insert({
            user_id: connection.user_id,
            connection_id: connection.id,
            gmail_message_id: gmailId,
            thread_id: msg.threadId,
            from_address: fromAddress,
            from_name: fromName,
            to_address: toAddress,
            subject: subject,
            body_text: text.substring(0, 10000), // Limit size
            body_html: html.substring(0, 50000),
            received_at: receivedAt,
            is_casting_email: isCasting,
            processing_status: isCasting ? "pending" : "skipped",
          })

        if (insertError) {
          console.error("Failed to insert email:", insertError)
        } else {
          inserted++

          // Auto-upsert sender into contacts table
          const senderEmail = fromAddress.match(/<(.+?)>/)?.[1] || fromAddress.trim()
          if (senderEmail && senderEmail.includes("@")) {
            const emailDomain = senderEmail.split("@")[1]
            const companyName = emailDomain
              .split(".")[0]
              .split("-")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join("-")

            const { data: existingContact } = await supabaseAdmin
              .from("contacts")
              .select("id")
              .eq("user_id", connection.user_id)
              .eq("email", senderEmail)
              .single()

            if (existingContact) {
              // Update last_contact_date if contact already exists
              await supabaseAdmin
                .from("contacts")
                .update({ last_contact_date: receivedAt.substring(0, 10) })
                .eq("id", existingContact.id)
            } else {
              // Insert new contact
              const { data: newContact } = await supabaseAdmin
                .from("contacts")
                .insert({
                  user_id: connection.user_id,
                  name: fromName,
                  email: senderEmail,
                  company: companyName,
                  role: isCasting ? "Casting" : null,
                  priority: 3,
                  last_contact_date: receivedAt.substring(0, 10),
                })
                .select("id")
                .single()

              // Fire-and-forget: generate a 1-sentence description via LLM
              if (newContact) {
                ;(async () => {
                  try {
                    const desc = await llm("low", [
                      { role: "user", content: `Write a 1-sentence professional description of this contact based on what we know. Name: ${fromName}. Email domain: ${senderEmail.split("@")[1]}. Subject of their email: ${subject}. Keep it under 20 words.` },
                    ], 100)
                    if (desc.content) {
                      await supabaseAdmin
                        .from("contacts")
                        .update({ notes: desc.content.trim() })
                        .eq("id", newContact.id)
                    }
                  } catch (e) {
                    console.error("LLM contact description failed:", e)
                  }
                })()
              }
            }
          }
        }
      }

      // Update connection with new cursor
      if (historyId) {
        await supabaseAdmin
          .from("email_connections")
          .update({
            sync_cursor: historyId,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id)
      }

      results.push({
        connection_id: connection.id,
        status: "success",
        emails_fetched: messages.length,
        emails_inserted: inserted,
        emails_skipped: skipped,
        history_id: historyId,
      })
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    console.error("Email sync error:", err)
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    )
  }
}
