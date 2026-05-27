"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/helpers"

export async function getConversations() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  // Get conversation IDs where this profile is a participant
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", profile.id)

  if (partError) throw new Error(partError.message)
  const convIds = participations.map((p) => p.conversation_id)
  if (convIds.length === 0) return []

  // Get conversations with participants and last messages
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select(`
      id,
      subject,
      created_at,
      conversation_participants (
        profile_id,
        profiles (id, full_name, email, role, avatar_url)
      ),
      messages (
        id,
        body,
        created_at,
        sender_id
      )
    `)
    .in("id", convIds)
    .order("created_at", { ascending: false })

  if (convError) throw new Error(convError.message)

  // Format conversations to identify the "other" participants
  return conversations.map((c) => {
    // Sort messages to get the latest
    const msgs = c.messages as unknown as { id: number; body: string; created_at: string; sender_id: number }[] | undefined
    const sortedMessages = [...(msgs || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastMessage = sortedMessages[0] || null

    // Filter out current user from participants list
    const otherParticipants = c.conversation_participants
      .filter((cp) => cp.profile_id !== profile.id)
      .map((cp) => cp.profiles)

    return {
      id: c.id,
      subject: c.subject,
      created_at: c.created_at,
      otherParticipant: otherParticipants[0] || null,
      lastMessage,
    }
  })
}

export async function getMessages(
  conversationId: number,
  beforeTimestamp?: string,
  pageSize = 50
) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  let query = supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      body,
      created_at,
      profiles!messages_sender_id_fkey (id, full_name, role, avatar_url)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(pageSize)

  if (beforeTimestamp) {
    query = query.lt("created_at", beforeTimestamp)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const nextCursor =
    data && data.length === pageSize
      ? data[data.length - 1].created_at
      : null

  return { data: data ?? [], nextCursor }
}

export async function sendMessage(conversationId: number, body: string, attachment?: { url: string; type: string }) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const insertData: {
    conversation_id: number
    sender_id: number
    body: string
    attachment_url?: string
    attachment_type?: string
  } = {
    conversation_id: conversationId,
    sender_id: profile.id,
    body,
  }

  if (attachment) {
    insertData.attachment_url = attachment.url
    insertData.attachment_type = attachment.type
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function uploadAttachment(formData: FormData): Promise<{ url: string; type: string }> {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File must be smaller than 10MB")
  }

  // Determine attachment type
  let attachmentType: string
  if (file.type.startsWith("image/")) attachmentType = "image"
  else if (file.type.startsWith("video/")) attachmentType = "video"
  else if (file.type.startsWith("audio/")) attachmentType = "audio"
  else attachmentType = "document"

  // Generate unique filename
  const ext = file.name.split(".").pop() || "bin"
  const fileName = `${profile.school_id}/${profile.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: urlData } = supabase.storage
    .from("chat-attachments")
    .getPublicUrl(fileName)

  return { url: urlData.publicUrl, type: attachmentType }
}


export async function getRecipientProfiles() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  if (profile.role === "teacher") {
    // Teacher can message parents of students in their classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", profile.id)

    const classIds = classes?.map((c) => c.id) || []
    if (classIds.length === 0) return []

    const { data: parentEnrollments } = await supabase
      .from("enrollments")
      .select(`
        parent_id,
        profiles!enrollments_parent_id_fkey (id, full_name, email, role, avatar_url)
      `)
      .in("class_id", classIds)
      .not("parent_id", "is", null)

    const { data: studentEnrollments } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        profiles!enrollments_student_id_fkey (id, full_name, email, role, avatar_url)
      `)
      .in("class_id", classIds)

    const contactsMap = new Map()
    parentEnrollments?.forEach((e: any) => {
      if (e.profiles) contactsMap.set(e.profiles.id, e.profiles)
    })
    studentEnrollments?.forEach((e: any) => {
      if (e.profiles) contactsMap.set(e.profiles.id, e.profiles)
    })
    
    // Sort contacts alphabetically
    const contacts = Array.from(contactsMap.values())
    contacts.sort((a, b) => a.full_name.localeCompare(b.full_name))
    return contacts
  } else if (profile.role === "parent") {
    // Parent can message teachers of classes their children are enrolled in
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("parent_id", profile.id)

    const classIds = enrollments?.map((e) => e.class_id) || []
    if (classIds.length === 0) return []

    const { data: classes } = await supabase
      .from("classes")
      .select(`
        teacher_id,
        profiles!classes_teacher_id_fkey (id, full_name, email, role, avatar_url)
      `)
      .in("id", classIds)
      .not("teacher_id", "is", null)

    const teachersMap = new Map()
    classes?.forEach((c: any) => {
      if (c.profiles) teachersMap.set(c.profiles.id, c.profiles)
    })
    return Array.from(teachersMap.values())
  } else if (profile.role === "principal") {
    // Principal can message any teacher or parent in their school
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .eq("school_id", profile.school_id)
      .in("role", ["teacher", "parent"])
      .order("full_name")

    if (error) throw new Error(error.message)
    return data
  }
  return []
}

export async function startConversation(recipientId: number) {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) throw new Error("Not authenticated")

  // Check if a 1-on-1 conversation already exists between these two users
  const { data: myConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", profile.id)

  const { data: theirConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", recipientId)

  const myConvIds = myConvs?.map((c) => c.conversation_id) || []
  const theirConvIds = theirConvs?.map((c) => c.conversation_id) || []
  const sharedConvIds = myConvIds.filter((id) => theirConvIds.includes(id))

  if (sharedConvIds.length > 0) {
    const { data: participantsCount } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .in("conversation_id", sharedConvIds)

    const counts: Record<number, number> = {}
    participantsCount?.forEach((p) => {
      counts[p.conversation_id] = (counts[p.conversation_id] || 0) + 1
    })

    const oneOnOneConvId = sharedConvIds.find((id) => counts[id] === 2)
    if (oneOnOneConvId) {
      return { conversationId: oneOnOneConvId }
    }
  }

  // Create new conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      school_id: profile.school_id,
      subject: "Direct Chat",
    })
    .select()
    .single()

  if (convError) throw new Error(convError.message)

  // Add participants
  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conversation.id, profile_id: profile.id },
      { conversation_id: conversation.id, profile_id: recipientId },
    ])

  if (partError) throw new Error(partError.message)

  return { conversationId: conversation.id }
}
