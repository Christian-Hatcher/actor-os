import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { listScripts, createScriptRecord, deleteScript } from "@/lib/services/scripts"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

const ALLOWED_TYPES = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
const ALLOWED_EXTENSIONS = ["pdf", "txt", "docx"]
const MAX_SIZE = 25 * 1024 * 1024

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  try {
    const data = await listScripts(admin, userId, id)
    return NextResponse.json(data)
  } catch (err) {
    console.error("GET /api/jobs/[id]/scripts error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: jobId } = await params
  const admin = getSupabaseAdmin()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 })
    }

    const fileName = file.name
    const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension)

    if (!isValidType) {
      return NextResponse.json({ error: "Only PDF, TXT, DOCX allowed" }, { status: 415 })
    }

    const storagePath = `${userId}/${jobId}/${fileName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from("scripts")
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from("scripts").getPublicUrl(storagePath)
    const storageUrl = urlData.publicUrl

    const data = await createScriptRecord(admin, userId, {
      job_id: jobId,
      file_name: fileName,
      file_url: storageUrl,
      file_type: extension || file.type,
      file_size_bytes: file.size,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("POST /api/jobs/[id]/scripts error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await params
  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const { scriptId, storagePath } = body

    if (!scriptId) {
      return NextResponse.json({ error: "scriptId required" }, { status: 400 })
    }

    if (storagePath) {
      const { error: storageError } = await admin.storage
        .from("scripts")
        .remove([storagePath])

      if (storageError) {
        console.error("Storage delete error:", storageError)
      }
    }

    const data = await deleteScript(admin, userId, scriptId)
    return NextResponse.json(data)
  } catch (err) {
    console.error("DELETE /api/jobs/[id]/scripts error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
