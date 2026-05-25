"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Video,
  FileText,
  Users,
  Settings,
  Clapperboard,
  GraduationCap,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Auditions",
    href: "/dashboard/auditions",
    icon: Clapperboard,
  },
  {
    title: "Self-Tapes",
    href: "/dashboard/self-tapes",
    icon: Video,
  },
  {
    title: "Contracts",
    href: "/dashboard/contracts",
    icon: FileText,
  },
  {
    title: "Emails",
    href: "/dashboard/emails",
    icon: Mail,
  },
  {
    title: "Outreach",
    href: "/dashboard/outreach",
    icon: Users,
  },
  {
    title: "Universities",
    href: "/dashboard/universities",
    icon: GraduationCap,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2 px-4 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
