import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row'] | null

export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, school_id, role, full_name, email, phone, avatar_url')
    .eq('user_id', user.id)
    .single()

  return profile
})

export const getSchoolId = cache(async (): Promise<number | null> => {
  const profile = await getProfile()
  return profile?.school_id ?? null
})

export const getRole = cache(async (): Promise<string | null> => {
  const profile = await getProfile()
  return profile?.role ?? null
})

export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
})
