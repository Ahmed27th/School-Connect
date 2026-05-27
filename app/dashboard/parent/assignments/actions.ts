"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getParentAssignmentsData() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      profiles!enrollments_student_id_fkey (id, full_name, email, avatar_url),
      classes (id, name, section)
    `)
    .eq("parent_id", profile.id)

  const children = (enrollments || []).map((e: any) => ({
    profile: e.profiles,
    class: e.classes,
  }))

  const studentIds = children.map((c) => c.profile.id)
  if (studentIds.length === 0) return { children: [], assignmentsByChild: {} }

  const { data: allEnrollments } = await supabase
    .from("enrollments")
    .select("student_id, class_id")
    .in("student_id", studentIds)

  const classIds = [...new Set((allEnrollments || []).map((e) => e.class_id))]

  let assignments: any[] = []
  if (classIds.length > 0) {
    const { data: aData } = await supabase
      .from("assignments")
      .select("*")
      .in("class_id", classIds)
      .order("due_date", { ascending: true, nullsFirst: false })
    assignments = aData || []
  }

  const assignmentIds = assignments.map((a) => a.id)
  let submissions: any[] = []
  if (assignmentIds.length > 0 && studentIds.length > 0) {
    const { data: sData } = await supabase
      .from("submissions")
      .select("*")
      .in("assignment_id", assignmentIds)
      .in("student_id", studentIds)
    submissions = sData || []
  }

  const assignmentsByChild: Record<number, { upcoming: any[]; graded: any[] }> = {}
  for (const child of children) {
    const childEnrollments = (allEnrollments || []).filter(
      (e) => e.student_id === child.profile.id
    )
    const childClassIds = childEnrollments.map((e) => e.class_id)
    const childAssignments = assignments.filter((a) =>
      childClassIds.includes(a.class_id)
    )
    const childSubmissions = submissions.filter(
      (s) => s.student_id === child.profile.id
    )
    const submittedIds = childSubmissions.map((s) => s.assignment_id)

    const now = new Date().toISOString()
    const upcoming = childAssignments.filter(
      (a) =>
        a.due_date &&
        a.due_date > now &&
        !submittedIds.includes(a.id)
    )
    const graded = childSubmissions.filter((s) => s.grade !== null).map((s) => {
      const assignment = childAssignments.find((a) => a.id === s.assignment_id)
      return { ...s, assignment }
    }).filter((s) => s.assignment)

    assignmentsByChild[child.profile.id] = { upcoming, graded }
  }

  return { children, assignmentsByChild }
}
