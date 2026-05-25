import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth/guards"

export default async function DashboardRedirect() {
  const profile = await requireAuth()

  const routeMap: Record<string, string> = {
    principal: "/dashboard/principal",
    teacher: "/dashboard/teacher",
    parent: "/dashboard/parent",
    student: "/dashboard/student",
  }

  const target = routeMap[profile.role]
  if (target) redirect(target)

  redirect("/dashboard/principal")
}
