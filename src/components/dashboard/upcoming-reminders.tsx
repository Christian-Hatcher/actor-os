"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock } from "lucide-react"
import type { Reminder } from "@/types"

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "1",
    user_id: "user1",
    title: "Submit Shokz self-tape",
    description: "Athletic lead role. Deadline May 21 10AM.",
    due_date: "2026-05-21T10:00:00",
    type: "self_tape",
    related_id: "2",
    completed: false,
    created_at: "2026-05-20",
  },
  {
    id: "2",
    user_id: "user1",
    title: "Submit Home Appliance self-tape",
    description: "P Company. Deadline May 22 10AM.",
    due_date: "2026-05-22T10:00:00",
    type: "self_tape",
    related_id: "3",
    completed: false,
    created_at: "2026-05-20",
  },
  {
    id: "3",
    user_id: "user1",
    title: "LOST10 callback prep",
    description: "Practice sword choreography. Callback May 25.",
    due_date: "2026-05-24T18:00:00",
    type: "callback",
    related_id: "1",
    completed: false,
    created_at: "2026-05-10",
  },
  {
    id: "4",
    user_id: "user1",
    title: "Follow up with Cyrus Sethna",
    description: "Godzilla movie lead status check.",
    due_date: "2026-05-23T12:00:00",
    type: "follow_up",
    related_id: null,
    completed: false,
    created_at: "2026-05-19",
  },
]

const TYPE_LABELS = {
  general: "General",
  audition: "Audition",
  self_tape: "Self-Tape",
  callback: "Callback",
  follow_up: "Follow-up",
  contract: "Contract",
}

const TYPE_COLORS = {
  general: "bg-gray-100",
  audition: "bg-blue-100 text-blue-800",
  self_tape: "bg-purple-100 text-purple-800",
  callback: "bg-yellow-100 text-yellow-800",
  follow_up: "bg-green-100 text-green-800",
  contract: "bg-red-100 text-red-800",
}

export function UpcomingReminders({ className }: { className?: string }) {
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS)

  function toggleComplete(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Reminders</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {reminders.map((reminder) => (
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
                <Badge className={TYPE_COLORS[reminder.type]}>
                  {TYPE_LABELS[reminder.type]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {reminder.description}
              </p>
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
        ))}

        {reminders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            No upcoming reminders.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
