"use client"

import { useState } from "react"
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
import { Filter, Plus, Search } from "lucide-react"
import { useAuditions } from "@/hooks/use-data"

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  callback: "bg-yellow-100 text-yellow-800",
  pinned: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  passed: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-500",
}

export default function AuditionsPage() {
  const { auditions, loading } = useAuditions()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = auditions.filter((a) => {
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
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No auditions match your filters.
          </div>
        ) : (
          filtered.map((audition) => (
            <Card key={audition.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{audition.project_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {audition.role_name} {audition.agency ? `\u2022 ${audition.agency}` : ""}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[audition.status] || ""}>
                    {audition.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex gap-6">
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    {audition.submitted_date || "\u2014"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Callback: </span>
                    {audition.callback_date || "\u2014"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shoot: </span>
                    {audition.shoot_date || "\u2014"}
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
          ))
        )}
      </div>
    </DashboardShell>
  )
}
