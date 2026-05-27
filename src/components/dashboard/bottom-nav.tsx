"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Clapperboard,
  Video,
  BarChart3,
  User,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Match nested routes (e.g. /dashboard/auditions/[id]) as active. */
  matchPrefix?: boolean
}

// News-app style nav (Apple News inspiration): thin-stroke icon + tiny label.
// Active tab tints amber. Reads less app-y, more editorial.
const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: Home },
  { label: "Auditions", href: "/dashboard/auditions", icon: Clapperboard, matchPrefix: true },
  { label: "Tapes", href: "/dashboard/self-tapes", icon: Video, matchPrefix: true },
  { label: "Earnings", href: "/dashboard/earnings", icon: BarChart3, matchPrefix: true },
  { label: "Me", href: "/dashboard/settings", icon: User, matchPrefix: true },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.href)
  return pathname === item.href
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule px-1 pt-2 pb-3.5 backdrop-blur-2xl"
      style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[9.5px] font-medium transition-colors",
              active ? "text-amber" : "text-paper-faint hover:text-paper-dim",
            )}
          >
            <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
