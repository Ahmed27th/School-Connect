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
  } else if (profile.role === "teacher") {
    // Teacher: get students enrolled in classes taught by this teacher
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", profile.id)

    const classIds = classes?.map((c) => c.id) || []
    if (classIds.length === 0) return []

    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        enrollments!enrollments_student_id_fkey!inner (
          class_id,
          classes (name, section),
          profiles!enrollments_parent_id_fkey (full_name, email)
        )
      `)
      .eq("school_id", profile.school_id)
      .eq("role", "student")
      .in("enrollments.class_id", classIds)
      .order("full_name")

    if (studentsError) throw new Error(studentsError.message)
    return students
  }
  return []
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
