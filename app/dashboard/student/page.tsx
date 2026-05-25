import { GraduationCap } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"

export default async function StudentDashboard() {
  const profile = await requireRole("student")

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<GraduationCap className="size-5 text-primary" />}>
          Student Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Role: Student &middot; {profile.email}
        </p>
        <p className="font-body text-sm text-on-surface-muted">
          Welcome to School Connect. Use the navigation to check your
          attendance, view announcements, and stay connected with your school.
        </p>
      </DashboardCard>
    </div>
  )
}
