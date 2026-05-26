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
          const prev = old || []
          const updated = [...prev]

          records.forEach((r) => {
            const index = updated.findIndex((existing) => existing.student_id === r.student_id)
            if (index >= 0) {
              updated[index] = { ...updated[index], status: r.status, notes: r.notes || null }
            } else {
              updated.push({
                id: Math.random(), // Temporary ID
                class_id: classId,
                student_id: r.student_id,
                date,
                status: r.status,
                marked_by: 0,
                notes: r.notes || null,
                parent_notified: false,
                notified_at: null,
                created_at: new Date().toISOString(),
              })
            }
          })

          return updated
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
