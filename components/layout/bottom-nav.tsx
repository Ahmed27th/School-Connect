"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import {
  LayoutDashboard,
  MessageSquare,
  CalendarCheck,
  Megaphone,
  User,
} from "lucide-react"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

const items = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
  { icon: CalendarCheck, label: "Attendance", href: "/dashboard/attendance" },
  { icon: Megaphone, label: "Announcements", href: "/dashboard/announcements" },
  { icon: User, label: "Profile", href: "/dashboard/profile" },
]

export function BottomNav({ profile }: { profile: ProfileRow }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface shadow-[0_-2px_8px_rgba(0,0,0,0.06)] motion-safe:animate-in motion-safe:fade-in"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors",
              "min-h-[44px] min-w-[44px]",
              active
                ? "text-primary"
                : "text-on-surface-muted hover:text-on-surface"
            )}
          >
            <item.icon className="size-5" aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
