import { requireRole } from "@/lib/auth/guards"
import { getClassesData } from "../actions"
import { BookOpen, GraduationCap, User, Folder } from "lucide-react"
import Link from "next/link"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function ClassesPage() {
  const profile = await requireRole("principal", "teacher")
  const classes = await getClassesData()

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<BookOpen className="size-5 text-primary" />}>
          Classes Directory
        </DashboardCardTitle>
        <DashboardCardValue>{classes.length} Classes</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Overview of active academic classes and sections in your {profile.role === "principal" ? "school" : "schedule"}.
        </p>
      </DashboardCard>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls: any) => {
          const studentCount = cls.enrollments?.length || 0
          const teacherName = cls.profiles?.full_name || "Unassigned"

          return (
            <div
              key={cls.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-on-surface">
                    {cls.name}
                  </span>
                  <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-body text-xs font-semibold text-primary">
                    {cls.grade || "No Grade"}
                  </span>
                </div>
                {cls.section && (
                  <p className="font-body text-xs text-on-surface-muted">
                    Section: <span className="font-medium text-on-surface">{cls.section}</span>
                  </p>
                )}
                {cls.academic_year && (
                  <p className="font-body text-xs text-on-surface-muted">
                    Year: <span className="font-medium text-on-surface">{cls.academic_year}</span>
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
                {profile.role === "principal" && (
                  <div className="flex items-center gap-2 font-body text-sm text-on-surface-muted">
                    <User className="size-4 text-primary" />
                    <span>
                      Teacher: <span className="font-medium text-on-surface">{teacherName}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-body text-sm text-on-surface-muted">
                    <GraduationCap className="size-4 text-primary" />
                    <span>
                      Enrolled: <span className="font-medium text-on-surface">{studentCount} Students</span>
                    </span>
                  </div>
                  <Link 
                    href={`/dashboard/classes/${cls.id}/drive`}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 font-body text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Folder className="size-3.5" />
                    Drive
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
        {classes.length === 0 && (
          <div className="col-span-full py-12 text-center font-body text-sm text-on-surface-muted">
            No classes found.
          </div>
        )}
      </div>
    </div>
  )
}
