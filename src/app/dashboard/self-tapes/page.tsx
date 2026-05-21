"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Clock, CheckCircle, AlertCircle, Upload } from "lucide-react"
import type { SelfTape } from "@/types"

const MOCK_TAPES: SelfTape[] = [
  {
    id: "1",
    user_id: "user1",
    audition_id: "1",
    title: "LOST10 — Ninja Scene",
    video_url: "https://storage.example.com/tape1.mp4",
    thumbnail_url: null,
    scene_partner: null,
    deadline: "2026-05-22",
    submitted: true,
    feedback: "Great energy. Callback confirmed for May 25.",
    created_at: "2026-05-10",
  },
  {
    id: "2",
    user_id: "user1",
    audition_id: "2",
    title: "Shokz Earphone — Athletic",
    video_url: "",
    thumbnail_url: null,
    scene_partner: null,
    deadline: "2026-05-21",
    submitted: false,
    feedback: null,
    created_at: "2026-05-20",
  },
  {
    id: "3",
    user_id: "user1",
    audition_id: "3",
    title: "Home Appliance — P Company",
    video_url: "",
    thumbnail_url: null,
    scene_partner: null,
    deadline: "2026-05-22",
    submitted: false,
    feedback: null,
    created_at: "2026-05-20",
  },
]

export default function SelfTapesPage() {
  const [tapes] = useState<SelfTape[]>(MOCK_TAPES)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Self-Tape Partner"
        text="Manage deadlines, uploads, and feedback in one place."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tapes.map((tape) => (
          <Card key={tape.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{tape.title}</CardTitle>
                {tape.submitted ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <Clock className="inline mr-1 h-3 w-3" />
                Deadline: {tape.deadline}
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              {tape.video_url ? (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload self-tape</p>
                </div>
              )}

              {tape.feedback && (
                <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm">
                  <p className="font-medium text-blue-800">Feedback</p>
                  <p className="text-blue-700">{tape.feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="flex flex-col items-center justify-center border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <Button variant="ghost">New Self-Tape</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
