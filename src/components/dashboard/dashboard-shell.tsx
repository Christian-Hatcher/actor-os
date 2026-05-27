"use client"

import { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"

interface DashboardShellProps {
  children: ReactNode
}

// Mobile-first editorial shell: a centered scroll column with a fixed
// news-style bottom nav. Replaces the old fixed sidebar. The 22px horizontal
// page padding matches the design spec across all phone scroll containers.
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg lg:max-w-[640px]">
      <main className="flex-1 px-[22px] pt-6 pb-28">{children}</main>
      <BottomNav />
    </div>
  )
}
