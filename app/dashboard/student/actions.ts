"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getStudentDashboardData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      class_id,
      classes (id, name, grade, section, teacher_id, profiles!classes_teacher_id_fkey (full_name))
    `)
    .eq("student_id", profile.id)

  const classes = (enrollments || []).map((e: any) => e.classes).filter(Boolean)

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("id, date, status, class_id")
    .eq("student_id", profile.id)
    .gte("date", firstOfMonth.toISOString().split("T")[0])
    .order("date", { ascending: false })

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(5)

  return { classes, attendance: attendance || [], announcements: announcements || [] }
}
