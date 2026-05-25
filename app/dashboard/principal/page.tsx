import { requireRole } from "@/lib/auth/guards"
import { BroadcastsView } from "./broadcasts-view"

export default async function PrincipalDashboard() {
  const profile = await requireRole("principal")

  return <BroadcastsView profile={profile} />
}
