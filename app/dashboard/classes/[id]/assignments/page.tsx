import { requireAuth } from "@/lib/auth/guards"
import { getDriveClassContext } from "../drive/actions"
import TeacherAssignmentsClient from "./teacher-assignments-client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await requireAuth()
  const resolvedParams = await params
  const classId = resolvedParams.id

  const classData = await getDriveClassContext(classId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/classes"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="size-5 text-on-surface-muted" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {classData.name} - Assignments
          </h1>
          <p className="font-body text-sm text-on-surface-muted">
            Create assignments, review submissions, and grade student work
          </p>
        </div>
      </div>
      <TeacherAssignmentsClient classId={classId} userRole={profile.role} />
    </div>
  )
}
