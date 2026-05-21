"use client"

import { ReactNode } from "react"
import { DashboardNav } from "./dashboard-nav"
import { UserNav } from "./user-nav"

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
            <Film className="mr-2 h-6 w-6" />
            <span className="text-lg font-bold">Actor OS</span>
          </div>
          <UserNav />
        </header>
        <main className="container mx-auto p-6">{children}</main>
      </div>
    </div>
  )
}

function Film(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  )
}
