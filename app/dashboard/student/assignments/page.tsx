import { requireRole } from "@/lib/auth/guards"
import StudentAssignmentsClient from "./student-assignments-client"

export default async function StudentAssignmentsPage() {
  const profile = await requireRole("student")

  return <StudentAssignmentsClient profile={profile} />
}
