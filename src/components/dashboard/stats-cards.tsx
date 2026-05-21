"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clapperboard, Video, Star, TrendingUp } from "lucide-react"
import type { DashboardStats } from "@/types"

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats>({
    total_auditions: 0,
    active_callbacks: 0,
    booked_jobs: 0,
    pending_self_tapes: 0,
    upcoming_reminders: 0,
    conversion_rate: 0,
  })

  useEffect(() => {
    // TODO: Replace with Supabase fetch
    setStats({
      total_auditions: 12,
      active_callbacks: 3,
      booked_jobs: 2,
      pending_self_tapes: 4,
      upcoming_reminders: 6,
      conversion_rate: 16.7,
    })
  }, [])

  const cards = [
    {
      title: "Total Auditions",
      value: stats.total_auditions,
      icon: Clapperboard,
      trend: "+2 this week",
    },
    {
      title: "Active Callbacks",
      value: stats.active_callbacks,
      icon: Star,
      trend: "1 awaiting response",
    },
    {
      title: "Booked Jobs",
      value: stats.booked_jobs,
      icon: TrendingUp,
      trend: "$4,200 earned",
    },
    {
      title: "Pending Self-Tapes",
      value: stats.pending_self_tapes,
      icon: Video,
      trend: "2 due this week",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.trend}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
