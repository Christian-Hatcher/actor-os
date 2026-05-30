"use client"

import { ReactNode } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { DashboardDataProvider } from "@/hooks/use-dashboard-data"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardDataProvider>{children}</DashboardDataProvider>
    </AuthGuard>
  )
}
