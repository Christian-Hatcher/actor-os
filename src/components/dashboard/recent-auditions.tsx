"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clapperboard } from "lucide-react"
import type { Audition } from "@/types"

const MOCK_RECENT: Audition[] = [
  {
    id: "1",
    user_id: "user1",
    project_name: "LOST10 — TBS Drama",
    role_name: "Guest Star",
    casting_director: "Yamazaki Group",
    agency: "BAYSIDE",
    status: "callback",
    submitted_date: "2026-05-09",
    callback_date: "2026-05-25",
    shoot_date: null,
    location: "Tokyo Studio",
    notes: "Ninja role. Prep sword fight choreography.",
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
    notes: "Deadline May 21 10AM.",
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: null,
    contract_url: null,
    created_at: "2026-05-20",
    updated_at: "2026-05-20",
  },
]

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-800",
  callback: "bg-yellow-100 text-yellow-800",
  pinned: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  passed: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-500",
}

export function RecentAuditions({ className }: { className?: string }) {
  const [auditions] = useState<Audition[]>(MOCK_RECENT)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Auditions</CardTitle>
        <Link
          href="/dashboard/auditions"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center"
        >
          View all
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="grid gap-4">
        {auditions.map((audition) => (
          <div
            key={audition.id}
            className="flex items-start justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <Clapperboard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{audition.project_name}</p>
                <p className="text-xs text-muted-foreground">
                  {audition.role_name} • {audition.agency}
                </p>
                {audition.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{audition.notes}</p>
                )}
              </div>
            </div>
            <Badge className={STATUS_COLORS[audition.status]}>
              {audition.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
