"use client"

import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { JobDetail } from "@/components/dashboard/job-detail"

export default function JobDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <DashboardShell>
      <JobDetail id={params.id} />
    </DashboardShell>
  )
}
