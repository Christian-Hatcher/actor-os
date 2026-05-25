"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clapperboard, Video, Star, TrendingUp } from "lucide-react"
import { useDashboardStats } from "@/hooks/use-data"

export function StatsCards() {
  const { stats, loading } = useDashboardStats()

  const cards = [
    {
      title: "Total Auditions",
      value: stats.total_auditions,
      icon: Clapperboard,
    },
    {
      title: "Active Callbacks",
      value: stats.active_callbacks,
      icon: Star,
    },
    {
      title: "Booked Jobs",
      value: stats.booked_jobs,
      icon: TrendingUp,
    },
    {
      title: "Pending Self-Tapes",
      value: stats.pending_self_tapes,
      icon: Video,
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
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
