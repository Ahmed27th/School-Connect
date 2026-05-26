import { requireRole } from "@/lib/auth/guards"
import { MessagesDashboard } from "./messages-dashboard"

export default async function MessagesPage() {
  const profile = await requireRole("principal", "teacher", "parent", "student")

  return <MessagesDashboard profile={profile} />
}
