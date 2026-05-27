"use client"

import * as React from "react"
import { Bell, CheckCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Alert {
  id: number
  student_id: number
  sent_at: string
  read_at: string | null
  method: string
  profiles: { id: number; full_name: string } | null
}

export function NotificationBell({
  initialAlerts,
  initialUnread,
}: {
  initialAlerts: Alert[]
  initialUnread: number
}) {
  const [alerts, setAlerts] = React.useState<Alert[]>(initialAlerts)
  const [details, setDetails] = React.useState<Record<number, { date: string; status: string } | null>>({})

  const unreadCount = alerts.filter((a) => !a.read_at).length

  const markAsRead = async (id: number) => {
    const { markAlertRead } = await import("@/app/dashboard/actions")
    await markAlertRead(id)
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
    )
  }

  const loadDetail = async (alert: Alert) => {
    if (details[alert.id] !== undefined) return
    const { getAlertDetails } = await import("@/app/dashboard/actions")
    const record = await getAlertDetails(alert.id)
    setDetails((prev) => ({ ...prev, [alert.id]: record }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex size-8 items-center justify-center rounded-lg text-on-surface-muted hover:bg-surface-tertiary hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      >
        <DropdownMenuContent align="start" side="bottom" sideOffset={8} className="w-80">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-display text-sm font-semibold text-on-surface">Attendance Alerts</p>
          </div>
          {alerts.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-body text-sm text-on-surface-muted">No alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={cn(
                  "flex flex-col items-start gap-1 px-3 py-2 cursor-pointer",
                  !alert.read_at && "bg-primary-light/30"
                )}
                onClick={() => {
                  markAsRead(alert.id)
                  loadDetail(alert)
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <p className="font-body text-sm font-medium text-on-surface">
                    {alert.profiles?.full_name || "Student"}
                  </p>
                  {!alert.read_at && (
                    <CheckCheck className="size-3.5 text-primary shrink-0" />
                  )}
                </div>
                <p className="font-body text-xs text-on-surface-muted">
                  {details[alert.id]
                    ? `Marked ${details[alert.id]?.status || "absent"} on ${new Date(details[alert.id]!.date).toLocaleDateString()}`
                    : `Alert sent ${new Date(alert.sent_at).toLocaleDateString()}`}
                </p>
                <p className="font-body text-[10px] text-on-surface-muted">
                  {new Date(alert.sent_at).toLocaleString()}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenuTrigger>
    </DropdownMenu>
  )
}
