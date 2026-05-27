import { requireAuth } from "@/lib/auth/guards"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const profile = await requireAuth()

  return <ProfileForm profile={profile} />
}
