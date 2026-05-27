"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getStudentsData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  if (profile.role === "principal") {
    // Principal: get all students in the school
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        enrollments!enrollments_student_id_fkey (
          classes (name, section),
          profiles!enrollments_parent_id_fkey (full_name, email)
        )
      `)
      .eq("school_id", profile.school_id)
      .eq("role", "student")
      .order("full_name")

    if (error) throw new Error(error.message)
    return data
  }
  return []
}

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

    Object.assign(base, { studentCount: studentCount || 0, teacherCount: teacherCount || 0, classCount: classCount || 0 })
  }

  if (profile.role === "teacher") {
    const { count: myClassCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", profile.id)

    base.myClassCount = myClassCount || 0
  }

  if (profile.role === "parent") {
    const { count: childCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", profile.id)

    base.childCount = childCount || 0
  }

  return base
}

export async function getAlerts() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { data: alerts } = await supabase
    .from("attendance_alerts")
    .select(`
      id,
      student_id,
      sent_at,
      read_at,
      method,
      profiles!attendance_alerts_student_id_fkey (id, full_name)
    `)
    .eq("parent_id", profile.id)
    .order("sent_at", { ascending: false })
    .limit(20)

  return (alerts || []).map((a: any) => ({
    ...a,
    attendance_records: null as { date: string; status: string; class_id: number; classes: { name: string } | null } | null,
  }))
}

export async function getAlertDetails(alertId: number) {
  const supabase = await createClient()
  const { data: alert } = await supabase
    .from("attendance_alerts")
    .select("attendance_id")
    .eq("id", alertId)
    .single()

  if (!alert) return null

  const { data: record } = await supabase
    .from("attendance_records")
    .select("date, status, class_id, classes (name)")
    .eq("id", alert.attendance_id)
    .single()

  return record
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

export async function getClassesData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  if (profile.role === "principal") {
    // Principal: get all classes with teacher name and enrollment count
    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        grade,
        section,
        academic_year,
        profiles!classes_teacher_id_fkey (full_name),
        enrollments (student_id)
      `)
      .eq("school_id", profile.school_id)
      .order("name")

    if (error) throw new Error(error.message)
    return data
  } else if (profile.role === "teacher") {
    // Teacher: get classes taught by this teacher
    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        grade,
        section,
        academic_year,
        enrollments (student_id)
      `)
      .eq("teacher_id", profile.id)
      .order("name")

    if (error) throw new Error(error.message)
    return data
  }
  return []
}
