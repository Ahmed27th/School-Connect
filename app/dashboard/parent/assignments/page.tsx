import { requireRole } from "@/lib/auth/guards"
import ParentAssignmentsClient from "./parent-assignments-client"

export default async function ParentAssignmentsPage() {
  const profile = await requireRole("parent")

  return <ParentAssignmentsClient profile={profile} />
}
