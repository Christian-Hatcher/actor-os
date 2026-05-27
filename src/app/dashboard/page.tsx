import { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export const metadata: Metadata = {
  title: "Today | Actor OS",
  description: "Your actor career command center",
}

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHome />
    </DashboardShell>
  )
}
