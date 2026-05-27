"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const fullName = formData.get("full_name") as string
  const phone = formData.get("phone") as string

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || profile.full_name,
      phone: phone || null,
    })
    .eq("id", profile.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/profile")
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get("current_password") as string
  const newPassword = formData.get("new_password") as string

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/profile")
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const file = formData.get("avatar") as File
  if (!file) throw new Error("No file provided")

  const ext = file.name.split(".").pop() || "png"
  const fileName = `avatars/${profile.school_id}/${profile.id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", profile.id)

  if (updateError) throw new Error(updateError.message)
  revalidatePath("/dashboard/profile")
  return { url: urlData.publicUrl }
}
