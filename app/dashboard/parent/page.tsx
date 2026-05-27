import { Heart, Users, CalendarCheck, MessageSquare, FileText } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { getParentDashboardData } from "./actions"
import Link from "next/link"

export default async function ParentDashboard() {
  const profile = await requireRole("parent")
  const { children, attendance, announcements } = await getParentDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Heart className="size-5 text-primary" />}>
          Parent Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">{profile.email}</p>
      </DashboardCard>

      {children.length === 0 ? (
        <DashboardCard>
          <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
            My Children
          </DashboardCardTitle>
          <p className="font-body text-sm text-on-surface-muted">
            No children linked to your account yet.
          </p>
        </DashboardCard>
      ) : (
        children.map((child: any) => {
          const childAttendance = attendance.filter(
            (a: any) => a.student_id === child.profile.id
          )
          const present = childAttendance.filter((a: any) => a.status === "present").length
          const absent = childAttendance.filter((a: any) => a.status === "absent").length
          const late = childAttendance.filter((a: any) => a.status === "late").length

          return (
            <div key={child.profile.id} className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary-light font-display text-lg font-bold text-primary">
                    {child.profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-on-surface">
                      {child.profile.full_name}
                    </h3>
                    <p className="font-body text-xs text-on-surface-muted">
                      {child.class?.name || "No class"}{child.class?.section ? ` - ${child.class.section}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-success">{present}</p>
                  <p className="font-body text-xs text-on-surface-muted">Present</p>
                </div>
                <div className="rounded-lg bg-error/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-error">{absent}</p>
                  <p className="font-body text-xs text-on-surface-muted">Absent</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-warning">{late}</p>
                  <p className="font-body text-xs text-on-surface-muted">Late</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/dashboard/parent/assignments"
                  className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
                >
                  <FileText className="size-3.5" />
                  Assignments
                </Link>
                <Link
                  href="/dashboard/attendance"
                  className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
                >
                  <CalendarCheck className="size-3.5" />
                  View Attendance
                </Link>
                <Link
                  href="/dashboard/messages"
                  className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-on-surface hover:bg-muted hover:text-foreground"
                >
                  <MessageSquare className="size-3.5" />
                  Message Teacher
                </Link>
              </div>
            </div>
          )
        })
      )}

      {announcements.length > 0 && (
        <DashboardCard>
          <DashboardCardTitle icon={<MessageSquare className="size-5 text-primary" />}>
            Recent Announcements
          </DashboardCardTitle>
          <div className="flex flex-col gap-2 mt-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg bg-surface-secondary p-3">
                <p className="font-body text-sm font-medium text-on-surface">{a.title}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">{a.body}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
