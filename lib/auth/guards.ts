import { redirect } from 'next/navigation'
import type { Database } from '@/types/supabase'
import { getProfile } from './helpers'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  return profile
}

export async function requireRole(...roles: string[]) {
  const profile = await requireAuth()
  if (!roles.includes(profile.role)) redirect('/dashboard')
  return profile
}
