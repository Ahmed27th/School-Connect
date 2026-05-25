"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Database } from "@/types/supabase"
import {
  markAttendance,
  getTeacherClasses,
  getClassStudents,
  getAttendance,
} from "./actions"

type AttendanceRow = Database["public"]["Tables"]["attendance_records"]["Row"]

export function useTeacherClasses(teacherId: number) {
  return useQuery({
    queryKey: ["teacher-classes", teacherId],
    queryFn: () => getTeacherClasses(teacherId),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClassStudents(classId: number) {
  return useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => getClassStudents(classId),
    enabled: !!classId,
  })
}

export function useAttendance(classId: number, date: string) {
  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: () => getAttendance(classId, date),
    enabled: !!classId && !!date,
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      records,
      date,
      classId,
    }: {
      records: { student_id: number; status: string; notes?: string }[]
      date: string
      classId: number
    }) => markAttendance(records, date, classId),

    onMutate: async ({ records, date, classId }) => {
      await queryClient.cancelQueries({
        queryKey: ["attendance", classId, date],
      })

      const previousAttendance = queryClient.getQueryData([
        "attendance",
        classId,
        date,
      ])

      queryClient.setQueryData<AttendanceRow[]>(
        ["attendance", classId, date],
        (old) => {
          if (!old)
            return records.map((r) => ({
              id: 0,
              class_id: classId,
              student_id: r.student_id,
              date,
              status: r.status,
              marked_by: 0,
              notes: r.notes || null,
              parent_notified: false,
              notified_at: null,
              created_at: new Date().toISOString(),
            }))

          return old.map((existing) => {
            const update = records.find(
              (r) => r.student_id === existing.student_id
            )
            if (update)
              return { ...existing, status: update.status, notes: update.notes || null }
            return existing
          })
        }
      )

      return { previousAttendance }
    },

    onError: (_err, variables, context) => {
      if (context?.previousAttendance) {
        queryClient.setQueryData(
          ["attendance", variables.classId, variables.date],
          context.previousAttendance
        )
      }
      toast.error("Failed to update attendance")
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", variables.classId, variables.date],
      })
    },
  })
}
