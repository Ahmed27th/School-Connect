"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/guards"

export async function getFolders(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("class_id", Number(classId))
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getResources(folderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("folder_id", Number(folderId))
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createFolder(classId: string, name: string) {
  const profile = await requireRole("teacher", "principal")
  const supabase = await createClient()
  
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("school_id")
    .eq("id", Number(classId))
    .single()
    
  if (classError || !classData) throw new Error("Class not found")

  const { data, error } = await supabase
    .from("folders")
    .insert({
      school_id: classData.school_id,
      class_id: Number(classId),
      name,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteFolder(folderId: string) {
  await requireRole("teacher", "principal")
  const supabase = await createClient()
  const { error } = await supabase.from("folders").delete().eq("id", Number(folderId))
  if (error) throw new Error(error.message)
}

export async function createResourceRecord(folderId: string, name: string, storagePath: string, sizeBytes: number, contentType: string) {
  const profile = await requireRole("teacher", "principal")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("resources")
    .insert({
      folder_id: Number(folderId),
      name,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      content_type: contentType,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteResourceRecord(resourceId: string) {
  await requireRole("teacher", "principal")
  const supabase = await createClient()
  
  // first get storage path to delete from storage
  const { data: resData } = await supabase.from("resources").select("storage_path").eq("id", Number(resourceId)).single()
  
  if (resData?.storage_path) {
    await supabase.storage.from("class_resources").remove([resData.storage_path])
  }

  const { error } = await supabase.from("resources").delete().eq("id", Number(resourceId))
  if (error) throw new Error(error.message)
}

export async function getDriveClassContext(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, school_id")
    .eq("id", Number(classId))
    .single()
  if (error) throw new Error(error.message)
  return data
}
