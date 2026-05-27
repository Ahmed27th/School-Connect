"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getStudentAssignments() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", profile.id)

  const classIds = (enrollments || []).map((e) => e.class_id)
  if (classIds.length === 0) return { assignments: [], submissions: [] }

  const { data: assignments, error: assignError } = await supabase
    .from("assignments")
    .select(`
      *,
      classes (id, name, section)
    `)
    .in("class_id", classIds)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (assignError) throw new Error(assignError.message)

  const assignmentIds = (assignments || []).map((a) => a.id)
  let submissions: any[] = []
  if (assignmentIds.length > 0) {
    const { data: subData } = await supabase
      .from("submissions")
      .select("*")
      .in("assignment_id", assignmentIds)
      .eq("student_id", profile.id)

    submissions = subData || []
  }

  return { assignments: assignments || [], submissions }
}

export async function submitHomework(formData: FormData) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const assignmentId = formData.get("assignment_id") as string
  const file = formData.get("file") as File
  if (!assignmentId || !file) throw new Error("Missing assignment ID or file")

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File must be smaller than 10MB")
  }

  const ext = file.name.split(".").pop() || "bin"
  const storagePath = `${assignmentId}/${profile.id}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("homework_submissions")
    .upload(storagePath, file, { upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: urlData } = supabase.storage
    .from("homework_submissions")
    .getPublicUrl(storagePath)

  const { error: insertError } = await supabase.from("submissions").insert({
    assignment_id: Number(assignmentId),
    student_id: profile.id,
    file_url: urlData.publicUrl,
  })

  if (insertError) throw new Error(insertError.message)

  return { success: true }
}
