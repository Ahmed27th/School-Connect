import { requireAuth } from "@/lib/auth/guards"
import { BroadcastsView } from "../principal/broadcasts-view"

export default async function AnnouncementsPage() {
  const profile = await requireAuth()

  return <BroadcastsView profile={profile} />
}

