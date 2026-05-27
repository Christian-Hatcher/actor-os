"use client"

import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AuditionDetail } from "@/components/dashboard/audition-detail"

export default function AuditionDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <DashboardShell>
      <AuditionDetail id={params.id} />
    </DashboardShell>
  )
}
