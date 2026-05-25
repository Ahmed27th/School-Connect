'use server'

import { createClient } from '@/lib/supabase/server'
import { getSchoolId } from '@/lib/auth/helpers'
import { requireAuth } from '@/lib/auth/guards'

export async function getAnnouncements() {
  const schoolId = await getSchoolId()
  if (!schoolId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select('*, profiles(full_name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createAnnouncement(formData: {
  title: string
  body: string
  priority: string
  target_roles: string[]
}) {
  const schoolId = await getSchoolId()
  if (!schoolId) throw new Error('No school found')

  const profile = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      school_id: schoolId,
      author_id: profile.id,
      title: formData.title,
      body: formData.body,
      priority: formData.priority,
      target_roles: formData.target_roles,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteAnnouncement(id: number) {
  const schoolId = await getSchoolId()
  if (!schoolId) throw new Error('Not authenticated')

  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
}
