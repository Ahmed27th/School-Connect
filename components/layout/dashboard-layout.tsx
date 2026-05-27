import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  MessageSquare,
  Megaphone,
  GraduationCap,
  Settings,
} from "lucide-react"
import { Sidebar, SidebarHeader, SidebarLogo, SidebarGroup, SidebarItem, SidebarCollapseButton, SidebarUserMenu } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { getAlerts, getUnreadAlertCount } from "@/app/dashboard/actions"
import { NotificationBell } from "@/components/notification-bell"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

const staffNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Students", href: "/dashboard/students" },
  { icon: BookOpen, label: "Classes", href: "/dashboard/classes" },
  { icon: CalendarCheck, label: "Attendance", href: "/dashboard/attendance" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
  { icon: Megaphone, label: "Announcements", href: "/dashboard/announcements" },
]

const staffBottomItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
  { icon: CalendarCheck, label: "Attendance", href: "/dashboard/attendance" },
  { icon: Megaphone, label: "Announcements", href: "/dashboard/announcements" },
  { icon: Settings, label: "More", href: "/dashboard/settings" },
]

function isStaff(role: string) {
  return role === "principal" || role === "teacher"
}

export default async function DashboardLayout({
  profile,
  children,
}: {
  profile: ProfileRow
  children: React.ReactNode
}) {
  const staff = isStaff(profile.role)
  const alerts = profile.role === "parent" ? await getAlerts() : []
  const unreadAlertCount = profile.role === "parent" ? await getUnreadAlertCount() : 0

  if (staff) {
    return (
      <div className="flex min-h-screen bg-surface-secondary">
        <Sidebar profile={profile}>
          <SidebarHeader>
            <SidebarLogo>
              <GraduationCap className="size-7 text-primary" aria-hidden />
              <span className="font-display text-base font-bold text-on-surface">
                School
              </span>
            </SidebarLogo>
            <NotificationBell initialAlerts={alerts} initialUnread={unreadAlertCount} />
            <SidebarCollapseButton />
          </SidebarHeader>

          <SidebarGroup label="Main">
            {staffNavItems.map((item) => (
              <SidebarItem
                key={item.href}
                icon={<item.icon className="size-5" />}
                label={item.label}
                href={item.href}
              />
            ))}
          </SidebarGroup>

          <SidebarUserMenu profile={profile} />
        </Sidebar>

        <main
          className={cn(
            "flex-1 pb-16 lg:pb-0",
            "px-4 pt-16 md:px-6 lg:ml-60 lg:px-8 lg:pt-6"
          )}
        >
          <div className="mx-auto w-full max-w-(--breakpoint-xl)">
            {children}
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
          {staffBottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium text-on-surface-muted min-h-[44px] min-w-[44px]"
            >
              <item.icon className="size-5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface-secondary pb-16">
      <main className="flex-1 px-4 pt-4 md:px-6 md:pt-6 lg:px-8">
        {alerts.length > 0 && (
          <div className="flex items-center justify-end mb-3">
            <NotificationBell initialAlerts={alerts} initialUnread={unreadAlertCount} />
          </div>
        )}
        <div className="mx-auto w-full max-w-(--breakpoint-xl)">
          {children}
        </div>
      </main>

      <BottomNav profile={profile} />
    </div>
  )
}
