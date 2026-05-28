"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AuditionsView } from "@/components/dashboard/auditions-view"

export default function AuditionsPage() {
  return (
    <DashboardShell>
      <AuditionsView />
    </DashboardShell>
  )
}
