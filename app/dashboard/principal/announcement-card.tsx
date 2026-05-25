"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardCard, DashboardCardTitle, DashboardCardFooter } from "@/components/dashboard-card"
import { PriorityBadge } from "./priority-badge"
import type { Database } from "@/types/supabase"

type Announcement = Database["public"]["Tables"]["announcements"]["Row"] & {
  profiles: { full_name: string } | null
}

export function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
}: {
  announcement: Announcement
  onEdit: () => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const date = new Date(announcement.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <DashboardCard
      className={`relative border-l-4 ${
        announcement.priority === "emergency"
          ? "border-l-error"
          : announcement.priority === "high"
            ? "border-l-warning"
            : "border-l-primary"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <DashboardCardTitle>
          <span className="font-display text-base font-semibold text-on-surface">
            {announcement.title}
          </span>
        </DashboardCardTitle>
        <PriorityBadge priority={announcement.priority} />
      </div>

      <p className="font-body text-xs text-on-surface-muted">{date}</p>

      <div
        className={cn(
          "font-body text-sm text-on-surface",
          !expanded && "line-clamp-3"
        )}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      >
        {announcement.body}
      </div>

      {announcement.profiles?.full_name && (
        <p className="font-body text-xs text-on-surface-muted">
          by {announcement.profiles.full_name}
        </p>
      )}

      <DashboardCardFooter>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit announcement">
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (window.confirm("Are you sure? This cannot be undone.")) {
                onDelete(announcement.id)
              }
            }}
            aria-label="Delete announcement"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </DashboardCardFooter>
    </DashboardCard>
  )
}


