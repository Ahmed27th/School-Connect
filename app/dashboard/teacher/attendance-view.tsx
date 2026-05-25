"use client"

import { useState, useMemo } from "react"
import { Users, Calendar } from "lucide-react"
import type { Database } from "@/types/supabase"
import {
  useTeacherClasses,
  useClassStudents,
  useAttendance,
  useMarkAttendance,
} from "./hooks"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
import { StudentRow } from "./student-row"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
  DashboardCardFooter,
} from "@/components/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"

export function AttendanceView({ profile }: { profile: Profile }) {
  const today = new Date().toISOString().split("T")[0]
  const [selectedClassId, setSelectedClassId] = useState<number>(0)
  const [selectedDate, setSelectedDate] = useState(today)

  const { data: classes, isLoading: teacherLoading } = useTeacherClasses(profile.id)
  const { data: students, isLoading: studentsLoading } = useClassStudents(
    selectedClassId || 0
  )
  const { data: attendance, isLoading: attendanceLoading } = useAttendance(
    selectedClassId || 0,
    selectedDate
  )
  const markAttendance = useMarkAttendance()

  const teacherClasses = classes || []

  const attendanceMap = useMemo(() => {
    const map = new Map<number, string>()
    attendance?.forEach((a) => map.set(a.student_id, a.status))
    return map
  }, [attendance])

  const handleStatusChange = (studentId: number, status: string) => {
    if (!selectedClassId) return
    markAttendance.mutate({
      records: [{ student_id: studentId, status }],
      date: selectedDate,
      classId: selectedClassId,
    })
  }

  const isPending = markAttendance.isPending

  if (teacherLoading) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardCard>
          <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
            Loading...
          </DashboardCardTitle>
          <DashboardCardValue>--</DashboardCardValue>
        </DashboardCard>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle
          icon={<Users className="size-5 text-primary" />}
        >
          Attendance
        </DashboardCardTitle>
        <DashboardCardValue>
          {profile.full_name}
        </DashboardCardValue>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="class-select"
              className="font-body text-xs font-medium text-on-surface-muted"
            >
              Class
            </label>
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="h-11 rounded-lg border border-border bg-surface px-3 font-body text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value={0} disabled>
                Select a class
              </option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` - ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="date-picker"
              className="font-body text-xs font-medium text-on-surface-muted"
            >
              Date
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-11 rounded-lg border border-border bg-surface px-3 font-body text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
        </div>
      </DashboardCard>

      {!selectedClassId ? (
        <DashboardCard>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Calendar className="size-10 text-on-surface-muted" />
            <p className="font-body text-sm text-on-surface-muted">
              Select a class and date to manage attendance
            </p>
          </div>
        </DashboardCard>
      ) : studentsLoading || attendanceLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DashboardCard>
          <DashboardCardTitle>
            Students ({students?.length || 0})
          </DashboardCardTitle>
          <div className="space-y-2">
            {students?.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                currentStatus={attendanceMap.get(student.id)}
                onStatusChange={(status) =>
                  handleStatusChange(student.id, status)
                }
                disabled={isPending}
              />
            ))}
            {(!students || students.length === 0) && (
              <p className="py-4 text-center font-body text-sm text-on-surface-muted">
                No students enrolled in this class
              </p>
            )}
          </div>
          <DashboardCardFooter>
            <p className="font-body text-xs text-on-surface-muted">
              {attendance?.length || 0} of {students?.length || 0} records
            </p>
          </DashboardCardFooter>
        </DashboardCard>
      )}
    </div>
  )
}
