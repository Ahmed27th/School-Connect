import { Presentation } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher")

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Presentation className="size-5 text-primary" />}>
          Teacher Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Role: Teacher &middot; {profile.email}
        </p>
        <p className="font-body text-sm text-on-surface-muted">
          Welcome to your teaching dashboard. Use the navigation to take
          attendance, send messages to parents, and view announcements.
        </p>
      </DashboardCard>
    </div>
  )
}
