"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SelfTapesView } from "@/components/dashboard/self-tapes-view"

export default function SelfTapesPage() {
  return (
    <DashboardShell>
      <SelfTapesView />
    </DashboardShell>
  )
}
