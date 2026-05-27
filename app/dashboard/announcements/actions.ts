"use server"

import { createClient } from "@/lib/supabase/server"
import { getSchoolId } from "@/lib/auth/helpers"

export async function getAnnouncementsPaginated(page = 0, pageSize = 20) {
  const schoolId = await getSchoolId()
  if (!schoolId) return { data: [], hasMore: false }

  const supabase = await createClient()
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from("announcements")
    .select("*, profiles(full_name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  return {
    data: data ?? [],
    hasMore: (data?.length ?? 0) === pageSize,
  }
}
