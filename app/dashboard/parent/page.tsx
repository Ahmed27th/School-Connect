import { Heart } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function ParentDashboard() {
  const profile = await requireRole("parent")

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Heart className="size-5 text-primary" />}>
          Parent Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Role: Parent &middot; {profile.email}
        </p>
        <p className="font-body text-sm text-on-surface-muted">
          Welcome to School Connect. Use the navigation to view your child&apos;s
          attendance, receive school announcements, and message your child&apos;s
          teachers.
        </p>
      </DashboardCard>
    </div>
  )
}
