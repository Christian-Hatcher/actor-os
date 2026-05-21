"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Mail, Phone, Calendar, Star, Building2 } from "lucide-react"
import type { Contact, OutreachLog } from "@/types"

const MOCK_CONTACTS: Contact[] = [
  {
    id: "1",
    user_id: "user1",
    name: "Cyrus Sethna",
    email: "cnsethna@soliconsultants.com",
    phone: null,
    role: "Agent",
    company: "Soli Consultants",
    last_contact_date: "2026-05-19",
    notes: "Godzilla lead. Active negotiations ongoing.",
    priority: 5,
    created_at: "2026-05-18",
  },
  {
    id: "2",
    user_id: "user1",
    name: "Yukimi Goto",
    email: "yukimi.goto@liliana.co.jp",
    phone: null,
    role: "Casting Coordinator",
    company: "Liliana Models",
    last_contact_date: "2026-05-20",
    notes: "Primary casting contact. Sends daily opportunities.",
    priority: 4,
    created_at: "2026-03-01",
  },
  {
    id: "3",
    user_id: "user1",
    name: "BAYSIDE Casting",
    email: "info@bay-side.biz",
    phone: null,
    role: "Casting Agency",
    company: "BAYSIDE",
    last_contact_date: "2026-05-09",
    notes: "LOST10 callback scheduled. Keep warm.",
    priority: 5,
    created_at: "2024-10-01",
  },
]

export default function OutreachPage() {
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [search, setSearch] = useState("")

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
    </DashboardShell>
  )
}
