import { requireAuth } from "@/lib/auth/guards"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireAuth()

  return <DashboardLayout profile={profile}>{children}</DashboardLayout>
}
