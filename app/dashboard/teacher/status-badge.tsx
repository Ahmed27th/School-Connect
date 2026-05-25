"use client"

import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-error/10 text-error",
  late: "bg-warning/10 text-warning",
  excused: "bg-muted text-muted-foreground",
}

const statusLabels: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        statusStyles[status] || "bg-muted text-muted-foreground"
      )}
    >
      {statusLabels[status] || status}
    </span>
  )
}
