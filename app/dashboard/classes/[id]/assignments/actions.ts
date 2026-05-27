"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/guards"

export async function getAssignments(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      submissions (
        id,
        student_id,
        file_url,
        grade,
        feedback,
        submitted_at,
        profiles!submissions_student_id_fkey (id, full_name, email)
      )
    `)
    .eq("class_id", Number(classId))
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getClassStudents(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      profiles!enrollments_student_id_fkey (id, full_name, email)
    `)
    .eq("class_id", Number(classId))

  if (error) throw new Error(error.message)
  return data?.map((e: any) => e.profiles).filter(Boolean) || []
}

export async function createAssignmentForClass(
  classId: string,
  formData: {
    title: string
    description?: string
    due_date?: string
    total_points: number
  }
) {
  const profile = await requireRole("teacher", "principal")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: Number(classId),
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date || null,
      total_points: formData.total_points,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateGrade(submissionId: number, grade: number | null, feedback: string | null) {
  await requireRole("teacher", "principal")
  const supabase = await createClient()

  const { error } = await supabase
    .from("submissions")
    .update({
      ...(grade !== undefined ? { grade } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
    })
    .eq("id", submissionId)

  if (error) throw new Error(error.message)
}

export async function deleteAssignment(assignmentId: number) {
  await requireRole("teacher", "principal")
  const supabase = await createClient()

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)

  if (error) throw new Error(error.message)
}
