"use client"

import { cn } from "@/lib/utils"

const priorityStyles: Record<string, string> = {
  emergency: "bg-error/10 text-error",
  high: "bg-warning/10 text-warning",
  normal: "bg-primary-light text-primary",
}

const priorityLabels: Record<string, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        priorityStyles[priority] || priorityStyles.normal
      )}
    >
      {priorityLabels[priority] || priority}
    </span>
  )
}
