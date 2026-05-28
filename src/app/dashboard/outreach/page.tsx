"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Plus, Mail, Phone, Calendar, Star, Building2, Loader2, Users } from "lucide-react"
import type { Contact, OutreachLog } from "@/types"

export default function OutreachPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true)
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("priority", { ascending: false })
        .order("last_contact_date", { ascending: false })

      if (error) {
        console.error("Failed to fetch contacts:", error)
      } else {
        setContacts((data || []) as Contact[])
      }
      setLoading(false)
    }

    fetchContacts()
  }, [])

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.role?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Outreach CRM"
        text="Manage relationships with casting directors, agents, and collaborators."
      />

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search contacts..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-5 w-16 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 && contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Contacts will appear here automatically when you sync your Gmail, or you can add them manually.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No matching contacts</p>
            <p className="text-sm text-muted-foreground">
              Try a different search term.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{contact.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {contact.company}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: contact.priority }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="mt-2">{contact.role}</Badge>
              </CardHeader>

              <CardContent className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{contact.email}</span>
                </div>

                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Last contact: {contact.last_contact_date || "Never"}</span>
                </div>

                {contact.notes && (
                  <p className="text-sm text-muted-foreground">{contact.notes}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="mr-1 h-3 w-3" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="mr-1 h-3 w-3" />
                    Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
