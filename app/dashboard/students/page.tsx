import { requireRole } from "@/lib/auth/guards"
import { getStudentsData } from "../actions"
import { Users, GraduationCap } from "lucide-react"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function StudentsPage() {
  const profile = await requireRole("principal", "teacher")
  const students = await getStudentsData()

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
          Students Directory
        </DashboardCardTitle>
        <DashboardCardValue>{students.length} Students</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Roster of students enrolled in your {profile.role === "principal" ? "school" : "classes"}.
        </p>
      </DashboardCard>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-body text-sm text-on-surface">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Parent</th>
                <th className="px-6 py-4">Parent Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student: any) => {
                const enrollment = student.enrollments?.[0]
                const className = enrollment?.classes
                  ? `${enrollment.classes.name}${enrollment.classes.section ? ` - ${enrollment.classes.section}` : ""}`
                  : "Not Enrolled"
                const parentName = enrollment?.profiles?.full_name || "N/A"
                const parentEmail = enrollment?.profiles?.email || "N/A"

                return (
                  <tr key={student.id} className="transition-colors hover:bg-surface-secondary/50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-on-surface flex items-center gap-2">
                      <GraduationCap className="size-4 text-primary-hover" />
                      {student.full_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-on-surface-muted">
                      {student.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-on-surface-muted">
                      {student.phone || "--"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-primary">
                      {className}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-on-surface">
                      {parentName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-on-surface-muted">
                      {parentEmail}
                    </td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-muted">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
