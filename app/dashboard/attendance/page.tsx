import { requireAuth } from "@/lib/auth/guards"
import { AttendanceView } from "../teacher/attendance-view"
import { ParentAttendanceView } from "./parent-attendance-view"

export default async function AttendancePage() {
  const profile = await requireAuth()

  if (profile.role === "parent" || profile.role === "student") {
    return <ParentAttendanceView profile={profile} />
  }

  return <AttendanceView profile={profile} />
}
