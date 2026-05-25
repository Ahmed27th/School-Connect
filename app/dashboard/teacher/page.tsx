import { requireRole } from "@/lib/auth/guards"
import { AttendanceView } from "./attendance-view"

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher")

  return <AttendanceView profile={profile} />
}
