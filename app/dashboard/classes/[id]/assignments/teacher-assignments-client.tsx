"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, FileText, Download, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  getAssignments,
  getClassStudents,
  createAssignmentForClass,
  updateGrade,
  deleteAssignment,
} from "./actions"

export default function TeacherAssignmentsClient({
  classId,
  userRole,
}: {
  classId: string
  userRole: string
}) {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expandedAssignment, setExpandedAssignment] = useState<number | null>(null)

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments", classId],
    queryFn: () => getAssignments(classId),
  })

  const { data: students } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => getClassStudents(classId),
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      description: string
      due_date: string
      total_points: number
    }) => createAssignmentForClass(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", classId] })
      setSheetOpen(false)
      toast.success("Assignment created")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const gradeMutation = useMutation({
    mutationFn: ({
      submissionId,
      grade,
      feedback,
    }: {
      submissionId: number
      grade: number | null
      feedback: string | null
    }) => updateGrade(submissionId, grade, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", classId] })
      toast.success("Grade saved")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", classId] })
      toast.success("Assignment deleted")
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger render={<Button><Plus className="size-4" />New Assignment</Button>} />
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>New Assignment</SheetTitle>
            </SheetHeader>
            <AssignmentForm
              isPending={createMutation.isPending}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <FileText className="size-10 text-on-surface-muted mx-auto mb-3" />
          <p className="font-body text-sm text-on-surface-muted">
            No assignments yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {assignments.map((assignment) => {
            const isExpanded = expandedAssignment === assignment.id
            const submissionList = (assignment as any).submissions || []
            const submittedCount = submissionList.length
            const gradedCount = submissionList.filter((s: any) => s.grade !== null).length

            return (
              <div key={assignment.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedAssignment(isExpanded ? null : assignment.id)
                  }
                  className="w-full flex items-center justify-between p-5 hover:bg-surface-hover/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="size-5 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="size-5 shrink-0 text-on-surface-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-on-surface truncate">
                        {assignment.title}
                      </p>
                      <p className="font-body text-xs text-on-surface-muted mt-0.5">
                        {assignment.due_date
                          ? `Due: ${new Date(assignment.due_date).toLocaleDateString()}`
                          : "No due date"}
                        {" · "}{assignment.total_points} pts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-body text-sm font-medium text-on-surface">
                        {submittedCount}/{students?.length || 0}
                      </p>
                      <p className="font-body text-[10px] text-on-surface-muted">
                        {gradedCount} graded
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Delete this assignment and all submissions?")) {
                          deleteMutation.mutate(assignment.id)
                        }
                      }}
                      className="rounded-full p-2 text-on-surface-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      aria-label="Delete assignment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </button>

                {isExpanded && (
                  <GradingTable
                    assignment={assignment}
                    students={students || []}
                    submissions={submissionList}
                    totalPoints={assignment.total_points}
                    gradeMutation={gradeMutation}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GradingTable({
  assignment,
  students,
  submissions,
  totalPoints,
  gradeMutation,
}: {
  assignment: any
  students: any[]
  submissions: any[]
  totalPoints: number
  gradeMutation: any
}) {
  return (
    <div className="border-t border-border">
      {(assignment as any).description && (
        <div className="px-5 py-3 bg-surface-secondary/30">
          <p className="font-body text-sm text-on-surface-muted">
            {(assignment as any).description}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-sm">
          <thead className="bg-background/50 text-on-surface-muted border-b border-border">
            <tr>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">File</th>
              <th className="px-5 py-3 font-medium w-24">Grade</th>
              <th className="px-5 py-3 font-medium">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student: any) => (
              <GradingRow
                key={student.id}
                student={student}
                submission={submissions.find((s: any) => s.student_id === student.id)}
                assignmentTitle={assignment.title}
                totalPoints={totalPoints}
                gradeMutation={gradeMutation}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GradingRow({
  student,
  submission,
  assignmentTitle,
  totalPoints,
  gradeMutation,
}: {
  student: any
  submission: any
  assignmentTitle: string
  totalPoints: number
  gradeMutation: any
}) {
  const [gradeInput, setGradeInput] = useState(submission?.grade?.toString() ?? "")
  const [feedbackInput, setFeedbackInput] = useState(submission?.feedback ?? "")

  const handleSave = () => {
    if (!submission) return
    const g = gradeInput !== "" ? Number(gradeInput) : null
    const f = feedbackInput || null
    if (g !== submission.grade || f !== submission.feedback) {
      gradeMutation.mutate({
        submissionId: submission.id,
        grade: g,
        feedback: f,
      })
    }
  }

  return (
    <tr className="hover:bg-surface-hover/50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary-light text-primary font-display text-xs font-semibold">
            {student.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-on-surface">{student.full_name}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        {submission ? (
          <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Submitted
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
            Not Submitted
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        {submission?.file_url ? (
          <button
            onClick={async () => {
              try {
                const response = await fetch(submission.file_url)
                const blob = await response.blob()
                const blobUrl = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = blobUrl
                a.download = `${student.full_name}_${assignmentTitle}`
                document.body.appendChild(a)
                a.click()
                URL.revokeObjectURL(blobUrl)
                document.body.removeChild(a)
              } catch {
                toast.error("Failed to download file")
              }
            }}
            className="flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors"
          >
            <Download className="size-3.5" />
            <span className="text-xs">Download</span>
          </button>
        ) : (
          <span className="text-on-surface-muted text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={gradeInput}
            onChange={(e) => setGradeInput(e.target.value)}
            placeholder="—"
            min={0}
            max={totalPoints}
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-on-surface-muted">/{totalPoints}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={feedbackInput}
            onChange={(e) => setFeedbackInput(e.target.value)}
            placeholder="Add feedback..."
            className="flex-1 min-w-[140px] rounded-md border border-border bg-background px-2 py-1 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {submission && (
            <button
              onClick={handleSave}
              disabled={gradeMutation.isPending}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
            >
              Save
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function AssignmentForm({
  isPending,
  onSubmit,
  onCancel,
}: {
  isPending: boolean
  onSubmit: (data: {
    title: string
    description: string
    due_date: string
    total_points: number
  }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [totalPoints, setTotalPoints] = useState("100")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate,
      total_points: Number(totalPoints) || 100,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-medium text-on-surface-muted">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 5 Homework"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-medium text-on-surface-muted">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description or instructions"
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-medium text-on-surface-muted">Due Date</label>
        <Input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-medium text-on-surface-muted">Total Points</label>
        <Input
          type="number"
          value={totalPoints}
          onChange={(e) => setTotalPoints(e.target.value)}
          min={1}
          required
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !title.trim()}>
          {isPending ? "Creating..." : "Create Assignment"}
        </Button>
      </div>
    </form>
  )
}
