"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from "@/components/ui/sheet"
import {
  LogOut,
  Settings,
  ChevronLeft,
  PanelLeft,
  User,
} from "lucide-react"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("Sidebar sub-components must be used within <Sidebar>")
  return ctx
}

export function Sidebar({
  profile,
  children,
}: {
  profile: ProfileRow
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface-secondary transition-all duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {children}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <button
              type="button"
              className="fixed left-4 top-3 z-20 flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-on-surface hover:bg-surface-tertiary lg:hidden"
              aria-label="Open navigation menu"
            >
              <PanelLeft className="size-5" />
            </button>
          }
        />
        <SheetContent side="left" showCloseButton={false} className="w-60 p-0">
          <aside className="flex h-full flex-col border-r border-border bg-surface-secondary">
            {children}
          </aside>
        </SheetContent>
      </Sheet>
    </SidebarContext.Provider>
  )
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { collapsed } = useSidebar()
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        "flex h-14 items-center gap-3 border-b border-border px-4",
        collapsed && "justify-center px-0",
        className
      )}
      {...props}
    />
  )
}

export function SidebarLogo({
  collapsed: forceCollapsed,
  className,
  ...props
}: React.ComponentProps<"div"> & { collapsed?: boolean }) {
  const { collapsed } = useSidebar()
  const isCollapsed = forceCollapsed ?? collapsed
  return (
    <div
      data-slot="sidebar-logo"
      className={cn(
        "flex items-center gap-2",
        isCollapsed && "justify-center",
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroup({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  const { collapsed } = useSidebar()
  return (
    <div
      data-slot="sidebar-group"
      className={cn("px-3 py-2", className)}
      {...props}
    >
      {label && !collapsed && (
        <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-on-surface-muted">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  )
}

export function SidebarItem({
  icon,
  label,
  href,
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  icon: React.ReactNode
  label: string
  href: string
}) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      data-active={active}
      data-collapsed={collapsed}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
        "text-on-surface-muted hover:bg-surface-tertiary hover:text-on-surface",
        "data-[active=true]:bg-primary-light data-[active=true]:text-primary",
        collapsed && "justify-center px-0",
        className
      )}
      {...props}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function SidebarCollapseButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { collapsed, setCollapsed } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn("hidden lg:flex", className)}
      {...props}
    >
      <ChevronLeft
        className={cn("size-4 transition-transform", collapsed && "rotate-180")}
      />
    </Button>
  )
}

export function SidebarUserMenu({ profile }: { profile: ProfileRow }) {
  const { collapsed } = useSidebar()
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  const triggerButtonClass =
    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const collapsedTriggerClass =
    "mx-auto flex size-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="mt-auto border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={collapsed ? collapsedTriggerClass : triggerButtonClass}
              aria-label="User menu"
            />
          }
        >
          <Avatar size="sm">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col items-start text-left">
              <span className="text-sm font-medium text-on-surface">
                {profile.full_name}
              </span>
              <span className="text-xs text-on-surface-muted">
                {profile.email}
              </span>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" sideOffset={12}>
          <DropdownMenuItem
            render={<Link href="/dashboard/profile" />}
          >
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/dashboard/settings" />}
          >
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


