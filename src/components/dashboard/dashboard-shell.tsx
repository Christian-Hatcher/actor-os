"use client"

import { ReactNode } from "react"
import { DashboardNav } from "./dashboard-nav"
import { UserNav } from "./user-nav"
import { MobileNav } from "./mobile-nav"
import { Film } from "lucide-react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-background lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <Film className="mr-2 h-6 w-6" />
          <span className="text-lg font-bold">Actor OS</span>
        </div>
        <DashboardNav />
      </aside>
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="lg:hidden flex items-center">
            <MobileNav />
            <Film className="mr-2 h-6 w-6 ml-2" />
            <span className="text-lg font-bold">Actor OS</span>
          </div>
          <UserNav />
        </header>
        <main className="container mx-auto p-6">{children}</main>
      </div>
    </div>
  )
}
