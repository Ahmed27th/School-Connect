import { requireAuth } from "@/lib/auth/guards"
import { getDashboardMetrics } from "./actions"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { Users, BookOpen, GraduationCap, Heart, MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function DashboardHome() {
  const profile = await requireAuth()
  const metrics = await getDashboardMetrics()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Welcome, {profile.full_name}
        </h1>
        <p className="font-body text-sm text-on-surface-muted mt-1 capitalize">
          {profile.role} Dashboard
        </p>
      </div>

      {profile.role === "principal" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/students">
              <DashboardCard>
                <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
                  Students
                </DashboardCardTitle>
                <DashboardCardValue>{metrics.studentCount ?? 0}</DashboardCardValue>
              </DashboardCard>
            </Link>
            <Link href="/dashboard/classes">
              <DashboardCard>
                <DashboardCardTitle icon={<BookOpen className="size-5 text-primary" />}>
                  Classes
                </DashboardCardTitle>
                <DashboardCardValue>{metrics.classCount ?? 0}</DashboardCardValue>
              </DashboardCard>
            </Link>
            <Link href="/dashboard/students">
              <DashboardCard>
                <DashboardCardTitle icon={<GraduationCap className="size-5 text-primary" />}>
                  Teachers
                </DashboardCardTitle>
                <DashboardCardValue>{metrics.teacherCount ?? 0}</DashboardCardValue>
              </DashboardCard>
            </Link>
          </div>
          <DashboardCard>
            <DashboardCardTitle icon={<MessageSquare className="size-5 text-primary" />}>
              Quick Actions
            </DashboardCardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link href="/dashboard/announcements" className="font-body text-sm text-primary hover:underline">Create Announcement</Link>
              <span className="text-on-surface-muted">·</span>
              <Link href="/dashboard/messages" className="font-body text-sm text-primary hover:underline">Messages</Link>
              <span className="text-on-surface-muted">·</span>
              <Link href="/dashboard/attendance" className="font-body text-sm text-primary hover:underline">Attendance</Link>
            </div>
          </DashboardCard>
        </>
      )}

      {profile.role === "teacher" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/classes">
              <DashboardCard>
                <DashboardCardTitle icon={<BookOpen className="size-5 text-primary" />}>
                  My Classes
                </DashboardCardTitle>
                <DashboardCardValue>{metrics.myClassCount ?? 0}</DashboardCardValue>
              </DashboardCard>
            </Link>
            <Link href="/dashboard/attendance">
              <DashboardCard>
                <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
                  Students
                </DashboardCardTitle>
                <DashboardCardValue>{metrics.studentCount ?? 0}</DashboardCardValue>
              </DashboardCard>
            </Link>
            <Link href="/dashboard/messages">
              <DashboardCard>
                <DashboardCardTitle icon={<MessageSquare className="size-5 text-primary" />}>
                  Messages
                </DashboardCardTitle>
                <DashboardCardValue className="text-2xl">Inbox</DashboardCardValue>
              </DashboardCard>
            </Link>
          </div>
          <DashboardCard>
            <DashboardCardTitle>Quick Actions</DashboardCardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link href="/dashboard/attendance" className="font-body text-sm text-primary hover:underline">Mark Attendance</Link>
              <span className="text-on-surface-muted">·</span>
              <Link href="/dashboard/messages" className="font-body text-sm text-primary hover:underline">Message Parents</Link>
            </div>
          </DashboardCard>
        </>
      )}

      {profile.role === "parent" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/parent">
            <DashboardCard>
              <DashboardCardTitle icon={<Heart className="size-5 text-primary" />}>
                My Children
              </DashboardCardTitle>
              <DashboardCardValue>{metrics.childCount ?? 0}</DashboardCardValue>
            </DashboardCard>
          </Link>
          <Link href="/dashboard/attendance">
            <DashboardCard>
              <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
                Attendance
              </DashboardCardTitle>
              <DashboardCardValue className="text-2xl">View</DashboardCardValue>
            </DashboardCard>
          </Link>
        </div>
      )}

      {profile.role === "student" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/student">
            <DashboardCard>
              <DashboardCardTitle icon={<GraduationCap className="size-5 text-primary" />}>
                My Dashboard
              </DashboardCardTitle>
              <DashboardCardValue>Overview</DashboardCardValue>
            </DashboardCard>
          </Link>
          <Link href="/dashboard/attendance">
            <DashboardCard>
              <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
                My Attendance
              </DashboardCardTitle>
              <DashboardCardValue className="text-2xl">View</DashboardCardValue>
            </DashboardCard>
          </Link>
        </div>
      )}
    </div>
  )
}
