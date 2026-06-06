"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Clapperboard,
  Video,
  BarChart3,
  User,
  FileSearch,
  Users,
  Receipt,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Module ID used for gating. Core modules are always shown. */
  moduleId: string
  /** Match nested routes (e.g. /dashboard/auditions/[id]) as active. */
  matchPrefix?: boolean
}

/** Modules that are always visible regardless of enabled_modules. */
const CORE_MODULES = new Set(["dashboard", "casting", "self_tapes", "settings", "jobs"])

/** Default modules when profile.enabled_modules is not yet populated. */
const DEFAULT_MODULES = ["dashboard", "casting", "emails", "self_tapes", "settings", "jobs"]

// Full nav item registry. Core items always render; gated items render
// only when their moduleId appears in the user's enabled_modules array.
const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: Home, moduleId: "dashboard" },
  { label: "Auditions", href: "/dashboard/auditions", icon: Clapperboard, moduleId: "casting", matchPrefix: true },
  { label: "Jobs", href: "/dashboard/jobs", icon: Briefcase, moduleId: "jobs", matchPrefix: true },
  { label: "Tapes", href: "/dashboard/self-tapes", icon: Video, moduleId: "self_tapes", matchPrefix: true },
  { label: "Earnings", href: "/dashboard/earnings", icon: BarChart3, moduleId: "earnings", matchPrefix: true },
  { label: "Contracts", href: "/dashboard/contracts", icon: FileSearch, moduleId: "contract_reader", matchPrefix: true },
  { label: "Outreach", href: "/dashboard/outreach", icon: Users, moduleId: "outreach", matchPrefix: true },
  { label: "Cast", href: "/dashboard/productions", icon: Users, moduleId: "productions", matchPrefix: true },
  { label: "Tax", href: "/dashboard/tax", icon: Receipt, moduleId: "tax", matchPrefix: true },
  { label: "Me", href: "/dashboard/settings", icon: User, moduleId: "settings", matchPrefix: true },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.href)
  return pathname === item.href
}

export function BottomNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const enabledModules: string[] =
    (profile?.enabled_modules as string[] | null) ?? DEFAULT_MODULES

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => CORE_MODULES.has(item.moduleId) || enabledModules.includes(item.moduleId),
  )

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule px-1 pt-2 pb-3.5 backdrop-blur-2xl"
      style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
      aria-label="Primary"
    >
      {visibleItems.map((item) => {
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
