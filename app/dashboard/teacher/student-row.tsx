"use client"

import { StatusBadge } from "./status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const statusOptions = [
  { value: "present", label: "P", color: "text-success", title: "Present" },
  { value: "absent", label: "A", color: "text-error", title: "Absent" },
  { value: "late", label: "L", color: "text-warning", title: "Late" },
  { value: "excused", label: "E", color: "text-muted-foreground", title: "Excused" },
]

export function StudentRow({
  student,
  currentStatus,
  onStatusChange,
  disabled,
}: {
  student: { id: number; full_name: string; avatar_url?: string | null }
  currentStatus?: string
  onStatusChange: (status: string) => void
  disabled: boolean
}) {
  const initial = student.full_name.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3 transition-colors">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {student.full_name}
        </p>
      </div>

      {currentStatus && (
        <div className="mr-1">
          <StatusBadge status={currentStatus} />
        </div>
      )}

      <div className="flex gap-1">
        {statusOptions.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="xs"
            disabled={disabled || currentStatus === opt.value}
            onClick={() => onStatusChange(opt.value)}
            title={opt.title}
            className={cn(
              "min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold",
              currentStatus === opt.value
                ? `${opt.color} bg-surface-secondary`
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
