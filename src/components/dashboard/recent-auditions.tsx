"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clapperboard } from "lucide-react"
import { useAuditions } from "@/hooks/use-data"

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  callback: "bg-yellow-100 text-yellow-800",
  pinned: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  passed: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-500",
}

export function RecentAuditions({ className }: { className?: string }) {
  const { auditions, loading } = useAuditions()
  const recent = auditions.slice(0, 5)

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
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))
        ) : recent.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clapperboard className="h-8 w-8 mx-auto mb-2" />
            No auditions yet. Add your first one!
          </div>
        ) : (
          recent.map((audition) => (
            <div
              key={audition.id}
              className="flex items-start justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start gap-3">
                <Clapperboard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{audition.project_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {audition.role_name} {audition.agency ? `\u2022 ${audition.agency}` : ""}
                  </p>
                  {audition.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{audition.notes}</p>
                  )}
                </div>
              </div>
              <Badge className={STATUS_COLORS[audition.status] || ""}>
                {audition.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
