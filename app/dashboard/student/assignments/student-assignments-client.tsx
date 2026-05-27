"use client"

import React, { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, CheckCircle2, Award, Upload, Calendar, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { getStudentAssignments, submitHomework } from "./actions"

export default function StudentAssignmentsClient({
  profile,
}: {
  profile: { id: number; full_name: string }
}) {
  const queryClient = useQueryClient()
  const [uploadingFor, setUploadingFor] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["student-assignments"],
    queryFn: getStudentAssignments,
  })

  const submitMutation = useMutation({
    mutationFn: (formData: FormData) => submitHomework(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-assignments"] })
      setUploadingFor(null)
      toast.success("Homework submitted!")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const assignments = data?.assignments || []
  const submissions = data?.submissions || []
  const submittedIds = submissions.map((s: any) => s.assignment_id)
  const now = new Date().toISOString()

  const todo = assignments.filter(
    (a: any) => !submittedIds.includes(a.id) && (!a.due_date || a.due_date > now)
  )
  const submitted = assignments.filter(
    (a: any) =>
      submittedIds.includes(a.id) &&
      !submissions.find((s: any) => s.assignment_id === a.id)?.grade
  )
  const graded = submissions.filter((s: any) => s.grade !== null)

  const handleUploadClick = (assignmentId: number) => {
    setUploadingFor(assignmentId)
    setTimeout(() => fileInputRef.current?.click(), 0)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploadingFor === null) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10MB")
      return
    }

    const formData = new FormData()
    formData.append("assignment_id", String(uploadingFor))
    formData.append("file", file)
    submitMutation.mutate(formData)

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">My Assignments</h1>
        <p className="font-body text-sm text-on-surface-muted">
          Track and submit your homework
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* To Do */}
          <KanbanColumn
            title="To Do"
            icon={<Clock className="size-4 text-warning" />}
            color="border-t-warning"
            empty="No pending assignments"
          >
            {todo.map((a: any) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onUpload={() => handleUploadClick(a.id)}
                isUploading={submitMutation.isPending && uploadingFor === a.id}
              />
            ))}
          </KanbanColumn>

          {/* Submitted */}
          <KanbanColumn
            title="Submitted"
            icon={<CheckCircle2 className="size-4 text-primary" />}
            color="border-t-primary"
            empty="No submissions yet"
          >
            {submitted.map((a: any) => {
              const s = submissions.find((sub: any) => sub.assignment_id === a.id)
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-border bg-surface p-4 shadow-sm"
                >
                  <p className="font-display font-semibold text-sm text-on-surface truncate">
                    {a.title}
                  </p>
                  <p className="font-body text-xs text-on-surface-muted mt-1">
                    {(a as any).classes?.name || "Class"} · {a.total_points} pts
                  </p>
                  <p className="font-body text-xs text-success mt-2 flex items-center gap-1">
                    <Upload className="size-3" />
                    Submitted {s ? new Date(s.submitted_at).toLocaleDateString() : ""}
                  </p>
                </div>
              )
            })}
          </KanbanColumn>

          {/* Graded */}
          <KanbanColumn
            title="Graded"
            icon={<Award className="size-4 text-success" />}
            color="border-t-success"
            empty="No graded work yet"
          >
            {graded.map((s: any) => {
              const a = assignments.find((as: any) => as.id === s.assignment_id)
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-surface p-4 shadow-sm"
                >
                  <p className="font-display font-semibold text-sm text-on-surface truncate">
                    {a?.title || "Assignment"}
                  </p>
                  <p className="font-body text-xs text-on-surface-muted mt-1">
                    {a?.total_points || 100} pts
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-success">{s.grade}</span>
                    <span className="text-xs text-on-surface-muted">/{a?.total_points || 100}</span>
                  </div>
                  {s.feedback && (
                    <p className="font-body text-xs text-on-surface-muted mt-1 italic">
                      &ldquo;{s.feedback}&rdquo;
                    </p>
                  )}
                </div>
              )
            })}
          </KanbanColumn>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
        onChange={handleFileSelect}
      />
    </div>
  )
}

function KanbanColumn({
  title,
  icon,
  color,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  color: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface-secondary/30 shadow-sm border-t-2 ${color}`}>
      <div className="flex items-center gap-2 p-4 border-b border-border">
        {icon}
        <h2 className="font-display font-semibold text-sm text-on-surface">{title}</h2>
      </div>
      <div className="flex flex-col gap-3 p-4 min-h-[200px]">
        {React.Children.count(children) === 0 ? (
          <p className="font-body text-xs text-on-surface-muted text-center py-8">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function AssignmentCard({
  assignment,
  onUpload,
  isUploading,
}: {
  assignment: any
  onUpload: () => void
  isUploading: boolean
}) {
  const isOverdue =
    assignment.due_date && new Date(assignment.due_date) < new Date()

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="font-display font-semibold text-sm text-on-surface truncate">
        {assignment.title}
      </p>
      <p className="font-body text-xs text-on-surface-muted mt-1">
        {(assignment as any).classes?.name || "Class"} · {assignment.total_points} pts
      </p>
      {assignment.due_date && (
        <p
          className={`font-body text-xs mt-1 flex items-center gap-1 ${
            isOverdue ? "text-error" : "text-on-surface-muted"
          }`}
        >
          <Calendar className="size-3" />
          Due: {new Date(assignment.due_date).toLocaleDateString()}
          {isOverdue && " (Overdue!)"}
        </p>
      )}
      {assignment.description && (
        <p className="font-body text-xs text-on-surface-muted mt-2 line-clamp-2">
          {assignment.description}
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={onUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <Upload className="size-3.5 mr-1.5" />
        )}
        Submit Homework
      </Button>
    </div>
  )
}
