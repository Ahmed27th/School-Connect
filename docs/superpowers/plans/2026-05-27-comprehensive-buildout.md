# Comprehensive Buildout Implementation Plan

> **Goal:** Fill all existing gaps: parent dashboard, student dashboard, dashboard home, notifications, editable profile, video call fixes, loading states.

**Architecture:** Server components + server actions for data, client components for interactivity. All data flows through Supabase RLS — no new tables needed.

**Tech Stack:** Next.js 16 (server actions, server components), Supabase (RLS, Realtime), Tailwind CSS 4, shadcn/ui

---

### Task 1: Parent Dashboard with Children & Attendance

**Files:**
- Create: `app/dashboard/parent/actions.ts`
- Modify: `app/dashboard/parent/page.tsx`

- [ ] **Step 1: Create parent dashboard server action**

```typescript
// app/dashboard/parent/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getParentDashboardData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  // Get children (enrollments where this profile is parent)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      profiles!enrollments_student_id_fkey (id, full_name, email, avatar_url, role),
      classes (id, name, grade, section, teacher_id)
    `)
    .eq("parent_id", profile.id)

  const children = (enrollments || []).map((e: any) => ({
    profile: e.profiles,
    class: e.classes,
  }))

  // Get attendance for all children (last 30 days)
  const studentIds = children.map((c) => c.profile.id)
  let attendance: any[] = []
  if (studentIds.length > 0) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: attData } = await supabase
      .from("attendance_records")
      .select("id, student_id, date, status, created_at, class_id, classes (name)")
      .in("student_id", studentIds)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
    attendance = attData || []
  }

  // Get recent announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_at, author_id")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(5)

  return { children, attendance, announcements: announcements || [] }
}
```

- [ ] **Step 2: Rewrite parent dashboard page**

```typescript
// app/dashboard/parent/page.tsx
import { Heart, Users, CalendarCheck, Megaphone } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { getParentDashboardData } from "./actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ParentDashboard() {
  const profile = await requireRole("parent")
  const { children, attendance, announcements } = await getParentDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Heart className="size-5 text-primary" />}>
          Parent Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">{profile.email}</p>
      </DashboardCard>

      {children.length === 0 ? (
        <DashboardCard>
          <DashboardCardTitle icon={<Users className="size-5 text-primary" />}>
            My Children
          </DashboardCardTitle>
          <p className="font-body text-sm text-on-surface-muted">
            No children linked to your account yet.
          </p>
        </DashboardCard>
      ) : (
        children.map((child: any) => {
          const childAttendance = attendance.filter(
            (a: any) => a.student_id === child.profile.id
          )
          const present = childAttendance.filter((a: any) => a.status === "present").length
          const absent = childAttendance.filter((a: any) => a.status === "absent").length
          const late = childAttendance.filter((a: any) => a.status === "late").length

          return (
            <div key={child.profile.id} className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary-light font-display text-lg font-bold text-primary">
                    {child.profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-on-surface">
                      {child.profile.full_name}
                    </h3>
                    <p className="font-body text-xs text-on-surface-muted">
                      {child.class?.name || "No class"} {child.class?.section ? `- ${child.class.section}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-success">{present}</p>
                  <p className="font-body text-xs text-on-surface-muted">Present</p>
                </div>
                <div className="rounded-lg bg-error/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-error">{absent}</p>
                  <p className="font-body text-xs text-on-surface-muted">Absent</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <p className="font-display text-xl font-bold text-warning">{late}</p>
                  <p className="font-body text-xs text-on-surface-muted">Late</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/attendance`}>
                    <CalendarCheck className="size-4 mr-1" />
                    View Attendance
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/messages`}>
                    <Megaphone className="size-4 mr-1" />
                    Message Teacher
                  </Link>
                </Button>
              </div>
            </div>
          )
        })
      )}

      {announcements.length > 0 && (
        <DashboardCard>
          <DashboardCardTitle icon={<Megaphone className="size-5 text-primary" />}>
            Recent Announcements
          </DashboardCardTitle>
          <div className="flex flex-col gap-2 mt-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg bg-surface-secondary p-3">
                <p className="font-body text-sm font-medium text-on-surface">{a.title}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">{a.body}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
```

---

### Task 2: Student Dashboard with Classes & Attendance

**Files:**
- Create: `app/dashboard/student/actions.ts`
- Modify: `app/dashboard/student/page.tsx`

- [ ] **Step 1: Create student dashboard server action**

```typescript
// app/dashboard/student/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getStudentDashboardData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  // Get enrolled classes
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      class_id,
      classes (id, name, grade, section, teacher_id, profiles!classes_teacher_id_fkey (full_name))
    `)
    .eq("student_id", profile.id)

  const classes = (enrollments || []).map((e: any) => e.classes)

  // Get attendance for this student (current month)
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("id, date, status, class_id, classes (name)")
    .eq("student_id", profile.id)
    .gte("date", firstOfMonth.toISOString().split("T")[0])
    .order("date", { ascending: false })

  // Get recent announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(5)

  return { classes, attendance: attendance || [], announcements: announcements || [] }
}
```

- [ ] **Step 2: Rewrite student dashboard page**

```typescript
// app/dashboard/student/page.tsx
import { GraduationCap, BookOpen, CalendarCheck, Megaphone } from "lucide-react"
import { requireRole } from "@/lib/auth/guards"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { getStudentDashboardData } from "./actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function StudentDashboard() {
  const profile = await requireRole("student")
  const { classes, attendance, announcements } = await getStudentDashboardData()

  const present = attendance.filter((a) => a.status === "present").length
  const absent = attendance.filter((a) => a.status === "absent").length
  const late = attendance.filter((a) => a.status === "late").length

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<GraduationCap className="size-5 text-primary" />}>
          Student Dashboard
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">{profile.email}</p>
      </DashboardCard>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-success">{present}</p>
          <p className="font-body text-xs text-on-surface-muted">Present</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-error">{absent}</p>
          <p className="font-body text-xs text-on-surface-muted">Absent</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="font-display text-2xl font-bold text-warning">{late}</p>
          <p className="font-body text-xs text-on-surface-muted">Late</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-5 text-primary" />
          <h3 className="font-display font-semibold text-on-surface">My Classes</h3>
        </div>
        {classes.length === 0 ? (
          <p className="font-body text-sm text-on-surface-muted">No classes enrolled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {classes.map((cls: any) => (
              <div key={cls.id} className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
                <div>
                  <p className="font-body text-sm font-medium text-on-surface">
                    {cls.name} {cls.section ? `- ${cls.section}` : ""}
                  </p>
                  <p className="font-body text-xs text-on-surface-muted">
                    Teacher: {cls.profiles?.full_name || "N/A"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/classes/${cls.id}/drive`}>Drive</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/attendance">
            <CalendarCheck className="size-4 mr-1" /> View Attendance
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/classes">
            <BookOpen className="size-4 mr-1" /> All Classes
          </Link>
        </Button>
      </div>

      {announcements.length > 0 && (
        <DashboardCard>
          <DashboardCardTitle icon={<Megaphone className="size-5 text-primary" />}>
            Recent Announcements
          </DashboardCardTitle>
          <div className="flex flex-col gap-2 mt-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg bg-surface-tertiary p-3">
                <p className="font-body text-sm font-medium text-on-surface">{a.title}</p>
                <p className="font-body text-xs text-on-surface-muted mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
```

---

### Task 3: Dashboard Home with Role-Based Metrics

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/actions.ts` (add helper)

- [ ] **Step 1: Add role metrics data function to actions.ts**

Add to `app/dashboard/actions.ts`:

```typescript
export async function getDashboardMetrics() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const base: any = { role: profile.role }

  if (profile.role === "principal" || profile.role === "teacher") {
    const { count: studentCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", profile.school_id)
      .eq("role", "student")

    const { count: teacherCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", profile.school_id)
      .eq("role", "teacher")

    const { count: classCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("school_id", profile.school_id)

    const { count: unreadMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })

    Object.assign(base, { studentCount, teacherCount, classCount })
  }

  if (profile.role === "teacher") {
    const { count: classCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", profile.id)

    base.myClassCount = classCount
  }

  if (profile.role === "parent") {
    const { count: childCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", profile.id)

    base.childCount = childCount
  }

  return base
}
```

- [ ] **Step 2: Rewrite dashboard home with role widgets**

```typescript
// app/dashboard/page.tsx
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
        <p className="font-body text-sm text-on-surface-muted mt-1">
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Dashboard
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
```

---

### Task 4: Notifications System (Bell + Attendance Alerts)

**Files:**
- Modify: `app/dashboard/actions.ts` (add getAlerts, markAlertRead)
- Create: `components/notification-bell.tsx`
- Modify: `components/layout/sidebar.tsx`
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Add notification server actions to app/dashboard/actions.ts**

Add at the end of `app/dashboard/actions.ts`:

```typescript
export async function getAlerts() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { data: alerts } = await supabase
    .from("attendance_alerts")
    .select(`
      id,
      attendance_id,
      student_id,
      sent_at,
      read_at,
      method,
      attendance_records!attendance_alerts_attendance_id_fkey (date, status, class_id, classes (name)),
      profiles!attendance_alerts_student_id_fkey (id, full_name)
    `)
    .eq("parent_id", profile.id)
    .order("sent_at", { ascending: false })
    .limit(20)

  return alerts || []
}

export async function markAlertRead(alertId: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("attendance_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("id", alertId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getUnreadAlertCount() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { count } = await supabase
    .from("attendance_alerts")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", profile.id)
    .is("read_at", null)

  return count || 0
}

export async function getUnreadMessageCount() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) return 0

  const { data: convIds } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("profile_id", profile.id)

  if (!convIds || convIds.length === 0) return 0

  let total = 0
  for (const conv of convIds) {
    let query = supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conv.conversation_id)
      .neq("sender_id", profile.id)

    if (conv.last_read_at) {
      query = query.gt("created_at", conv.last_read_at)
    }

    const { count } = await query
    total += count || 0
  }

  return total
}
```

- [ ] **Step 2: Create notification bell component**

```typescript
// components/notification-bell.tsx
"use client"

import * as React from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Alert {
  id: number
  student_id: number
  sent_at: string
  read_at: string | null
  attendance_records: { date: string; status: string; class_id: number; classes: { name: string } | null } | null
  profiles: { id: number; full_name: string } | null
}

export function NotificationBell({
  initialAlerts,
  initialUnread,
}: {
  initialAlerts: Alert[]
  initialUnread: number
}) {
  const [alerts, setAlerts] = React.useState<Alert[]>(initialAlerts)

  const unreadCount = alerts.filter((a) => !a.read_at).length

  const markAsRead = async (id: number) => {
    const { markAlertRead } = await import("@/app/dashboard/actions")
    await markAlertRead(id)
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex size-8 items-center justify-center rounded-lg text-on-surface-muted hover:bg-surface-tertiary hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      >
        <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-80">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-display text-sm font-semibold text-on-surface">Attendance Alerts</p>
          </div>
          {alerts.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-body text-sm text-on-surface-muted">No alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={cn(
                  "flex flex-col items-start gap-1 px-3 py-2 cursor-pointer",
                  !alert.read_at && "bg-primary-light/30"
                )}
                onClick={() => markAsRead(alert.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <p className="font-body text-sm font-medium text-on-surface">
                    {alert.profiles?.full_name || "Student"}
                  </p>
                  {!alert.read_at && (
                    <CheckCheck className="size-3.5 text-primary shrink-0" />
                  )}
                </div>
                <p className="font-body text-xs text-on-surface-muted">
                  Marked {alert.attendance_records?.status || "absent"} on{" "}
                  {alert.attendance_records?.date
                    ? new Date(alert.attendance_records.date).toLocaleDateString()
                    : "unknown date"}
                  {alert.attendance_records?.classes?.name
                    ? ` (${alert.attendance_records.classes.name})`
                    : ""}
                </p>
                <p className="font-body text-[10px] text-on-surface-muted">
                  {new Date(alert.sent_at).toLocaleString()}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenuTrigger>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Add notification bell to sidebar**

In `components/layout/sidebar.tsx`, add import for NotificationBell and a notification row in `SidebarHeader`:

```typescript
// In sidebar.tsx, add this import at top
import { NotificationBell } from "@/components/notification-bell"

// In sidebar.tsx SidebarHeader, add after the logo:
// This will be handled by a wrapper that passes alerts data
```

Better approach: modify `components/layout/dashboard-layout.tsx` to fetch alerts and pass to sidebar. Let me create a wrapper approach.

I'll modify the `dashboard-layout.tsx` to add the bell icon near the header. Since the sidebar is already a client component, I can pass a `notificationAlerts` prop.

Actually, the simplest approach: modify `dashboard-layout.tsx` to become a server component that fetches alerts and passes them to the client sidebar. But the layout file currently imports client components directly...

Let me take a simpler approach: Add the notification bell directly to `dashboard-layout.tsx` in the sidebar header area, within the `<SidebarHeader>` section. Since `dashboard-layout.tsx` is a client component (it imports client components), I need to fetch alerts on the client or create a thin wrapper.

Simplest: Just modify `sidebar.tsx` to accept notification alerts as props from `dashboard-layout.tsx`, which fetches them server-side before rendering.

Wait, `dashboard-layout.tsx` is currently a client component because it imports `Sidebar`, `BottomNav`. Let me check...

Actually it doesn't have "use client" at the top. Let me check if it's a server component that imports client components. Looking at the file again:

```typescript
import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import { ... } from "lucide-react"
import { Sidebar, ..., SidebarUserMenu } from "./sidebar"
import { BottomNav } from "./bottom-nav"
```

No "use client" directive - this is a server component that imports client components (Sidebar, BottomNav have "use client"). This is fine - server components can import and render client components, just can't pass functions or event handlers.

So I can add notification data fetching directly in `dashboard-layout.tsx`.

Let me modify the approach: have `dashboard-layout.tsx` fetch notification data and pass it to `Sidebar` as a prop. Then `Sidebar` renders the `NotificationBell`.

- [ ] **Step: Modify Sidebar to accept notification alerts**

Add a prop to `Sidebar` component:

```typescript
export function Sidebar({
  profile,
  notificationAlerts,
  notificationUnread = 0,
  children,
}: {
  profile: ProfileRow
  notificationAlerts?: any[]
  notificationUnread?: number
  children: React.ReactNode
})
```

Then add the bell in the `SidebarHeader`:

```typescript
// Inside Sidebar, after SidebarHeader children, add:
{!collapsed && notificationAlerts && (
  <NotificationBell initialAlerts={notificationAlerts} initialUnread={notificationUnread} />
)}
```

And modify `dashboard-layout.tsx` to fetch alerts and pass them:

```typescript
import { getAlerts, getUnreadAlertCount } from "@/app/dashboard/actions"

// In DashboardLayout, before the staff return:
const alerts = profile.role === "parent" ? await getAlerts() : []
const unreadAlertCount = profile.role === "parent" ? await getUnreadAlertCount() : 0

// Pass to Sidebar:
<Sidebar 
  profile={profile}
  notificationAlerts={alerts}
  notificationUnread={unreadAlertCount}
>
```

- [ ] **Step: Add unread message badge to sidebar nav**

Modify `sidebar.tsx` `SidebarItem` to accept a `badge` prop and show a count badge when collapsed or a small indicator.

---

### Task 5: Editable Profile + Password Change

**Files:**
- Create: `app/dashboard/profile/actions.ts`
- Modify: `app/dashboard/profile/page.tsx`

- [ ] **Step 1: Create profile server actions**

```typescript
// app/dashboard/profile/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const fullName = formData.get("full_name") as string
  const phone = formData.get("phone") as string

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || profile.full_name,
      phone: phone || null,
    })
    .eq("id", profile.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/profile")
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get("current_password") as string
  const newPassword = formData.get("new_password") as string

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const file = formData.get("avatar") as File
  if (!file) throw new Error("No file provided")

  const ext = file.name.split(".").pop() || "png"
  const fileName = `avatars/${profile.school_id}/${profile.id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", profile.id)

  if (updateError) throw new Error(updateError.message)
  revalidatePath("/dashboard/profile")
  return { url: urlData.publicUrl }
}
```

- [ ] **Step 2: Rewrite profile page as client component with edit form**

The profile page needs to become a client component ("use client") with edit form. It will fetch initial data from a server action.

---

### Task 6: Video Call TURN Server + Fixes

**Files:**
- Modify: `app/dashboard/messages/video-call.tsx`
- Create: `app/dashboard/profile/EditProfileForm.tsx`
- Add loading states to various pages

- [ ] **Step 1: Add TURN servers to video-call.tsx**

Replace `ICE_SERVERS` config:

```typescript
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
}
```
