import { ShieldCheck } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function PrincipalDashboard() {
  const profile = await requireRole("principal")

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<ShieldCheck className="size-5 text-primary" />}>
          Principal Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Role: Principal &middot; {profile.email}
        </p>
        <p className="font-body text-sm text-on-surface-muted">
          Welcome to your school administration dashboard. Use the navigation to
          manage announcements, view attendance, and communicate with staff and
          parents.
        </p>
      </DashboardCard>
    </div>
  )
}
