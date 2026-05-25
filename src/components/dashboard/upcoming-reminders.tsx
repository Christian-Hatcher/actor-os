"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Reminder } from "@/types"

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  audition: "Audition",
  self_tape: "Self-Tape",
  callback: "Callback",
  follow_up: "Follow-up",
  contract: "Contract",
}

const TYPE_COLORS: Record<string, string> = {
  general: "bg-gray-100",
  audition: "bg-blue-100 text-blue-800",
  self_tape: "bg-purple-100 text-purple-800",
  callback: "bg-yellow-100 text-yellow-800",
  follow_up: "bg-green-100 text-green-800",
  contract: "bg-red-100 text-red-800",
}

export function UpcomingReminders({ className }: { className?: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReminders() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user.user?.id
      if (!userId) { setLoading(false); return }

      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false)
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(10)

      if (data) setReminders(data as Reminder[])
      setLoading(false)
    }
    fetchReminders()
  }, [])

  async function toggleComplete(id: string) {
    const reminder = reminders.find((r) => r.id === id)
    if (!reminder) return

    const newCompleted = !reminder.completed
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: newCompleted } : r))
    )

    await supabase
      .from("reminders")
      .update({ completed: newCompleted })
      .eq("id", id)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Reminders</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            No upcoming reminders.
          </div>
        ) : (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                reminder.completed ? "opacity-50" : ""
              }`}
            >
              <Checkbox
                checked={reminder.completed}
                onCheckedChange={() => toggleComplete(reminder.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className={`font-medium text-sm ${
                      reminder.completed ? "line-through" : ""
                    }`}
                  >
                    {reminder.title}
                  </p>
                  <Badge className={TYPE_COLORS[reminder.type] || ""}>
                    {TYPE_LABELS[reminder.type] || reminder.type}
                  </Badge>
                </div>
                {reminder.description && (
                  <p className="text-xs text-muted-foreground">
                    {reminder.description}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(reminder.due_date).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
