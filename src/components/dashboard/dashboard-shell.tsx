"use client"

import { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"
import { SidebarNav } from "./sidebar-nav"

interface DashboardShellProps {
  children: ReactNode
}

// Responsive editorial shell.
// Mobile (< 1024px): centered column + bottom nav, max-w-[480px].
// Desktop (>= 1024px): fixed left sidebar + centered main content area.
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative min-h-screen bg-bg">
      {/* Desktop sidebar — hidden below lg */}
      <SidebarNav />

      {/* Main content area */}
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col lg:ml-[240px] lg:max-w-none">
        <main className="flex-1 px-[22px] pt-6 pb-28 lg:mx-auto lg:w-full lg:max-w-[800px] lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden at lg */}
      <BottomNav />
    </div>
  )
}
