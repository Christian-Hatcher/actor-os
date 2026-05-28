import { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { JobsView } from "@/components/dashboard/jobs-view"

export const metadata: Metadata = {
  title: "Jobs | Actor OS",
  description: "Booked, running, and wrapped jobs — the central hub for everything post-booking.",
}

export default function JobsPage() {
  return (
    <DashboardShell>
      <JobsView />
    </DashboardShell>
  )
}
