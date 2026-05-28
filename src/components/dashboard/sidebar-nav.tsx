"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Clapperboard,
  Video,
  BarChart3,
  User,
  FileText,
  Megaphone,
  Mail,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

interface SidebarItem {
  label: string
  href: string
  icon: LucideIcon
  matchPrefix?: boolean
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Today", href: "/dashboard", icon: Home },
  { label: "Auditions", href: "/dashboard/auditions", icon: Clapperboard, matchPrefix: true },
  { label: "Tapes", href: "/dashboard/self-tapes", icon: Video, matchPrefix: true },
  { label: "Earnings", href: "/dashboard/earnings", icon: BarChart3, matchPrefix: true },
  { label: "Contracts", href: "/dashboard/contracts", icon: FileText, matchPrefix: true },
  { label: "Outreach", href: "/dashboard/outreach", icon: Megaphone, matchPrefix: true },
  { label: "Emails", href: "/dashboard/emails", icon: Mail, matchPrefix: true },
  { label: "Me", href: "/dashboard/settings", icon: User, matchPrefix: true },
]

function isActive(pathname: string, item: SidebarItem): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.href)
  return pathname === item.href
}

export function SidebarNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AO"

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-rule bg-bg lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <span className="font-serif text-2xl tracking-tight text-paper">AO</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
          Actor OS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-[color-mix(in_srgb,var(--amber)_10%,transparent)] text-amber"
                  : "text-paper-dim hover:bg-bg3 hover:text-paper",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.6} aria-hidden />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="border-t border-rule px-4 py-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg3"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-bg3 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-paper">
              {profile?.full_name || "Actor"}
            </p>
            <p className="font-mono text-[10px] text-paper-faint">Profile</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
