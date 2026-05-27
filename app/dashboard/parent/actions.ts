"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getParentDashboardData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

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

  const studentIds = children.map((c) => c.profile.id)
  let attendance: any[] = []
  if (studentIds.length > 0) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: attData } = await supabase
      .from("attendance_records")
      .select("id, student_id, date, status, class_id")
      .in("student_id", studentIds)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
    attendance = attData || []
  }

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(5)

  return { children, attendance, announcements: announcements || [] }
}
