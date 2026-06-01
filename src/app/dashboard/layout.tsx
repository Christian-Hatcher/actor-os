"use client"

import { ReactNode } from "react"
import { DashboardDataProvider } from "@/hooks/use-dashboard-data"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardDataProvider>{children}</DashboardDataProvider>
  )
}
