"use client"

import { useQuery } from "@tanstack/react-query"
import { Calendar, Award, BookOpen, Clock, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getParentAssignmentsData } from "./actions"

export default function ParentAssignmentsClient({
  profile,
}: {
  profile: { id: number; full_name: string }
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["parent-assignments"],
    queryFn: getParentAssignmentsData,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const children = data?.children || []

  if (children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-on-surface">Assignments</h1>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <BookOpen className="size-10 text-on-surface-muted mx-auto mb-3" />
          <p className="font-body text-sm text-on-surface-muted">
            No children linked to your account yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Assignments</h1>
        <p className="font-body text-sm text-on-surface-muted">
          Track your children&apos;s upcoming deadlines and recent grades
        </p>
      </div>

      {children.map((child: any) => {
        const childData = data?.assignmentsByChild[child.profile.id]
        const upcoming = childData?.upcoming || []
        const graded = childData?.graded || []

        return (
          <div
            key={child.profile.id}
            className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden"
          >
            {/* Child Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border bg-surface-secondary/30">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-light text-primary font-display font-semibold text-sm">
                {child.profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-display font-semibold text-on-surface">
                  {child.profile.full_name}
                </h2>
                <p className="font-body text-xs text-on-surface-muted">
                  {child.class?.name || "Class"}
                  {child.class?.section ? ` - ${child.class.section}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-5">
              {/* Upcoming */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="size-4 text-warning" />
                  <h3 className="font-display text-sm font-semibold text-on-surface">
                    Upcoming Deadlines
                  </h3>
                </div>
                {upcoming.length === 0 ? (
                  <p className="font-body text-xs text-on-surface-muted pl-6">
                    No upcoming deadlines
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {upcoming.map((a: any) => (
                      <div
                        key={a.id}
                        className="rounded-lg bg-warning/5 border border-warning/20 p-3"
                      >
                        <p className="font-body text-sm font-medium text-on-surface truncate">
                          {a.title}
                        </p>
                        <p className="font-body text-xs text-warning mt-1 flex items-center gap-1">
                          <Clock className="size-3" />
                          Due: {new Date(a.due_date).toLocaleDateString()}
                        </p>
                        <p className="font-body text-[10px] text-on-surface-muted mt-0.5">
                          {a.total_points} pts
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recently Graded */}
              <div className="mt-4 md:mt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="size-4 text-success" />
                  <h3 className="font-display text-sm font-semibold text-on-surface">
                    Recently Graded
                  </h3>
                </div>
                {graded.length === 0 ? (
                  <p className="font-body text-xs text-on-surface-muted pl-6">
                    No graded work yet
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {graded.map((s: any) => (
                      <div
                        key={s.id}
                        className="rounded-lg bg-success/5 border border-success/20 p-3"
                      >
                        <p className="font-body text-sm font-medium text-on-surface truncate">
                          {s.assignment?.title || "Assignment"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold text-success">{s.grade}</span>
                          <span className="text-xs text-on-surface-muted">
                            /{s.assignment?.total_points || 100}
                          </span>
                        </div>
                        {s.feedback && (
                          <p className="font-body text-xs text-on-surface-muted mt-1 italic">
                            &ldquo;{s.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
