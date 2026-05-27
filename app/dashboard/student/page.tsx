import { GraduationCap, BookOpen, CalendarCheck, Megaphone, FolderOpen, FileText } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { getStudentDashboardData } from "./actions"
import Link from "next/link"

export default async function StudentDashboard() {
  const profile = await requireRole("student")
  const { classes, attendance, announcements } = await getStudentDashboardData()

  const present = attendance.filter((a) => a.status === "present").length
  const absent = attendance.filter((a) => a.status === "absent").length
  const late = attendance.filter((a) => a.status === "late").length

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<GraduationCap className="size-5 text-primary" />}>
          Student Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">{profile.email}</p>
      </DashboardCard>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-success">{present}</p>
          <p className="font-body text-xs text-on-surface-muted">Present</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-error">{absent}</p>
          <p className="font-body text-xs text-on-surface-muted">Absent</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-warning">{late}</p>
          <p className="font-body text-xs text-on-surface-muted">Late</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-5 text-primary" />
          <h3 className="font-display font-semibold text-on-surface">My Classes</h3>
        </div>
        {classes.length === 0 ? (
          <p className="font-body text-sm text-on-surface-muted">No classes enrolled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {classes.map((cls: any) => (
              <div key={cls.id} className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
                <div>
                  <p className="font-body text-sm font-medium text-on-surface">
                    {cls.name}{cls.section ? ` - ${cls.section}` : ""}
                  </p>
                  <p className="font-body text-xs text-on-surface-muted">
                    Teacher: {cls.profiles?.full_name || "N/A"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/classes/${cls.id}/drive`}
                  className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
                >
                  <FolderOpen className="size-3.5" />
                  Drive
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href="/dashboard/student/assignments"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
        >
          <FileText className="size-3.5" /> Assignments
        </Link>
        <Link
          href="/dashboard/attendance"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
        >
          <CalendarCheck className="size-3.5" /> View Attendance
        </Link>
        <Link
          href="/dashboard/classes"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
        >
          <BookOpen className="size-3.5" /> All Classes
        </Link>
      </div>

      {announcements.length > 0 && (
        <DashboardCard>
          <DashboardCardTitle icon={<Megaphone className="size-5 text-primary" />}>
            Recent Announcements
          </DashboardCardTitle>
          <div className="flex flex-col gap-2 mt-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg bg-surface-tertiary p-3">
                <p className="font-body text-sm font-medium text-on-surface">{a.title}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
