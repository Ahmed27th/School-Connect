import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"
import { DashboardCard, DashboardCardTitle } from "@/components/dashboard-card"
import { Calendar, Users } from "lucide-react"
import { StatusBadge } from "../teacher/status-badge"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export async function ParentAttendanceView({ profile }: { profile: Profile }) {
  const supabase = await createClient()

  // 1. Get enrollments for this parent
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      class_id,
      classes (name),
      profiles!enrollments_student_id_fkey (id, full_name, avatar_url)
    `)
    .eq("parent_id", profile.id)

  if (!enrollments || enrollments.length === 0) {
    return (
      <DashboardCard>
        <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
          Attendance
        </DashboardCardTitle>
        <p className="font-body text-sm text-on-surface-muted mt-4">
          No students found enrolled in your account.
        </p>
      </DashboardCard>
    )
  }

  const studentIds = enrollments.map((e) => e.student_id)

  // 2. Get recent attendance records for these students
  const { data: attendanceRecords } = await supabase
    .from("attendance_records")
    .select("*, classes(name)")
    .in("student_id", studentIds)
    .order("date", { ascending: false })
    .limit(30)

  // 3. Group records by student
  const studentsMap = new Map<number, any>()
  enrollments.forEach((e: any) => {
    if (e.profiles) {
      studentsMap.set(e.student_id, {
        profile: e.profiles,
        records: attendanceRecords?.filter((r) => r.student_id === e.student_id) || [],
      })
    }
  })

  const students = Array.from(studentsMap.values())

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Calendar className="size-5 text-primary" />}>
          Student Attendance
        </DashboardCardTitle>
        <p className="font-body text-sm text-on-surface-muted mt-1">
          Review recent attendance records for your children.
        </p>
      </DashboardCard>

      <div className="grid gap-6 md:grid-cols-2">
        {students.map((student) => (
          <div key={student.profile.id} className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4 border-b border-border pb-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light font-display text-sm font-bold text-primary">
                {student.profile.full_name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-display font-semibold text-on-surface">
                {student.profile.full_name}
              </h3>
            </div>

            {student.records.length === 0 ? (
              <p className="font-body text-sm text-on-surface-muted text-center py-4">
                No attendance records found.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {student.records.map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3">
                    <div className="flex flex-col">
                      <span className="font-display text-sm font-semibold text-on-surface">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="font-body text-xs text-on-surface-muted">
                        {record.classes?.name || "Class"}
                      </span>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
