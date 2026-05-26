"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Class = Database["public"]["Tables"]["classes"]["Row"]
type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"]

interface AttendanceUpsert {
  id?: number
  class_id: number
  student_id: number
  date: string
  status: string
  marked_by: number
  notes: string | null
  parent_notified: boolean
}

export async function getTeacherProfile(): Promise<{
  profile: Profile
  classes: Class[]
}> {
  const supabase = await createClient()

  const { data: profileId, error: profileError } = await supabase.rpc("get_profile_id")
  if (profileError || !profileId) throw new Error("Could not verify identity")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single()

  if (!profile) throw new Error("Profile not found")

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", profileId)
    .order("name")

  return { profile, classes: classes || [] }
}

export async function getTeacherClasses(teacherId: number): Promise<Class[]> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", teacherId)
    .single()

  if (profile?.role === "principal") {
    const { data: classes } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", profile.school_id)
      .order("name")
    return (classes || []) as Class[]
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("name")

  return (classes || []) as Class[]
}

export async function getClassStudents(classId: number): Promise<Profile[]> {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId) as {
    data: { student_id: number }[] | null
  }

  if (!enrollments || enrollments.length === 0) return []

  const studentIds = enrollments.map((e) => e.student_id)

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .in("id", studentIds)
    .order("full_name")

  return students || []
}

export async function getAttendance(
  classId: number,
  date: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("class_id", classId)
    .eq("date", date)

  return data || []
}

export async function markAttendance(
  records: { student_id: number; status: string; notes?: string }[],
  date: string,
  classId: number
): Promise<AttendanceRecord[]> {
  const supabase = await createClient()

  const { data: profileId, error: profileError } = await supabase.rpc("get_profile_id")
  if (profileError || !profileId) throw new Error("Could not verify identity")

  // Revert to authenticated client
  const supabaseAuth = supabase

  const { data: existing } = await supabaseAuth
    .from("attendance_records")
    .select("id, student_id")
    .eq("class_id", classId)
    .eq("date", date) as {
    data: { id: number; student_id: number }[] | null
  }

  const existingMap = new Map<number, number>()
  existing?.forEach((r) => existingMap.set(r.student_id, r.id))

  const results = []

  for (const r of records) {
    const base = {
      class_id: classId,
      student_id: r.student_id,
      date,
      status: r.status,
      marked_by: profileId,
      notes: r.notes || null,
      parent_notified: false,
    }

    const existingId = existingMap.get(r.student_id)
    if (existingId) {
      const { data, error } = await supabaseAuth
        .from("attendance_records")
        .update(base)
        .eq("id", existingId)
        .select()
        .single()
      if (error) throw new Error(error.message)
      results.push(data)
    } else {
      const { data, error } = await supabaseAuth
        .from("attendance_records")
        .insert([base])
        .select()
        .single()
      if (error) throw new Error(error.message)
      results.push(data)
    }
  }

  return results
}
