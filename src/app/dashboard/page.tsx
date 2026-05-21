import { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentAuditions } from "@/components/dashboard/recent-auditions"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"

export const metadata: Metadata = {
  title: "Dashboard | Actor OS",
  description: "Your actor career command center",
}

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        text="Track auditions, self-tapes, and career momentum."
      />
      <div className="grid gap-8">
        <StatsCards />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <RecentAuditions className="lg:col-span-4" />
          <UpcomingReminders className="lg:col-span-3" />
        </div>
      </div>
    </DashboardShell>
  )
}
