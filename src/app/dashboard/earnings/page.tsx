import { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EarningsView } from "@/components/dashboard/earnings-view"

export const metadata: Metadata = {
  title: "Earnings | Actor OS",
  description: "Your career P&L — banked, potential, and on pace.",
}

export default function EarningsPage() {
  return (
    <DashboardShell>
      <EarningsView />
    </DashboardShell>
  )
}
