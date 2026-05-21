"use client"

import { useState } from "react"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Filter } from "lucide-react"
import type { Audition } from "@/types"

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-800",
  callback: "bg-yellow-100 text-yellow-800",
  pinned: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  passed: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-500",
}

const MOCK_AUDITIONS: Audition[] = [
  {
    id: "1",
    user_id: "user1",
    project_name: "LOST10 — TBS Drama",
    role_name: "Guest Star — Episode 3",
    casting_director: "Yamazaki Group",
    agency: "BAYSIDE",
    status: "callback",
    submitted_date: "2026-05-09",
    callback_date: "2026-05-25",
    shoot_date: null,
    location: "Tokyo Studio",
    notes: "Ninja role. Need to prep sword fight choreography.",
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: "¥80,000/day",
    contract_url: null,
    created_at: "2026-05-09",
    updated_at: "2026-05-09",
  },
  {
    id: "2",
    user_id: "user1",
    project_name: "Shokz Earphone Commercial",
    role_name: "Athletic Lead",
    casting_director: "Liliana / Goto",
    agency: "Liliana Models",
    status: "submitted",
    submitted_date: "2026-05-20",
    callback_date: null,
    shoot_date: null,
    location: "Tokyo",
    notes: "Deadline May 21 10AM. Athletic build required.",
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: null,
    contract_url: null,
    created_at: "2026-05-20",
    updated_at: "2026-05-20",
  },
  {
    id: "3",
    user_id: "user1",
    project_name: "Home Appliance — P Company",
    role_name: "Supporting",
    casting_director: "Liliana / Goto",
    agency: "Liliana Models",
    status: "submitted",
    submitted_date: "2026-05-20",
    callback_date: null,
    shoot_date: null,
    location: null,
    notes: "Deadline May 22 10AM. Athletic individuals.",
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: null,
    contract_url: null,
    created_at: "2026-05-20",
    updated_at: "2026-05-20",
  },
  {
    id: "4",
    user_id: "user1",
    project_name: "Kamen Rider Toy Voice — BANDAI",
    role_name: "Voice Actor",
    casting_director: "BAYSIDE",
    agency: "BAYSIDE",
    status: "booked",
    submitted_date: "2026-03-05",
    callback_date: "2026-03-10",
    shoot_date: "2026-04-15",
    location: "Odaiba Studio",
    notes: "Narration complete. Invoice submitted.",
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: "¥150,000 buyout",
    contract_url: "docusign-link",
    created_at: "2026-03-05",
    updated_at: "2026-04-15",
  },
]

export default function AuditionsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = MOCK_AUDITIONS.filter((a) => {
    const matchesSearch =
      a.project_name.toLowerCase().includes(search.toLowerCase()) ||
      a.role_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.agency?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Casting Pipeline"
        text="Track every audition from submission to booking."
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, roles, agencies..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="callback">Callback</SelectItem>
            <SelectItem value="pinned">Pinned</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
          </SelectContent>
        </Select>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Audition
        </Button>
      </div>

      <div className="grid gap-4">
        {filtered.map((audition) => (
          <Card key={audition.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{audition.project_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {audition.role_name} • {audition.agency}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[audition.status]}>
                  {audition.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex gap-6">
                <div>
                  <span className="text-muted-foreground">Submitted: </span>
                  {audition.submitted_date || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Callback: </span>
                  {audition.callback_date || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Shoot: </span>
                  {audition.shoot_date || "—"}
                </div>
              </div>
              {audition.notes && (
                <p className="text-muted-foreground">{audition.notes}</p>
              )}
              {audition.compensation && (
                <div className="font-medium text-green-600">
                  {audition.compensation}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No auditions match your filters.
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
