"use client"

import { useState, useEffect, useRef } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Paperclip, Phone, Video, X, FileText, Image as ImageIcon, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getMessages, sendMessage, uploadAttachment } from "./actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoCall } from "./video-call"
import { toast } from "sonner"

export function ChatWindow({
  conversationId,
  recipient,
  profile,
}: {
  conversationId: number
  recipient: any
  profile: any
}) {
  const [inputText, setInputText] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [callMode, setCallMode] = useState<"audio" | "video" | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef(0)
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch messages with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      getMessages(conversationId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
  })

  const messages = data?.pages.flatMap((p) => p.data).reverse() ?? []

  // Mutation to send a message
  const sendMutation = useMutation({
    mutationFn: ({ body, attachment }: { body: string; attachment?: { url: string; type: string } }) =>
      sendMessage(conversationId, body, attachment),
    onSuccess: () => {
      setInputText("")
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    },
  })

  // Real-time subscription for incoming messages
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`realtime:messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient, supabase])

  // IntersectionObserver for infinite scroll upwards
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          if (scrollRef.current) {
            prevScrollHeightRef.current = scrollRef.current.scrollHeight
          }
          fetchNextPage()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Preserve scroll position after loading older messages
  useEffect(() => {
    if (!isFetchingNextPage && prevScrollHeightRef.current > 0 && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight
      scrollRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current
      prevScrollHeightRef.current = 0
    }
  }, [isFetchingNextPage])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    sendMutation.mutate({ body: inputText.trim() })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10MB")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const attachment = await uploadAttachment(formData)

      // Send a message with the attachment
      const msgBody = inputText.trim() || (file.type.startsWith("image/") ? "📷 Image" : `📎 ${file.name}`)
      await sendMutation.mutateAsync({ body: msgBody, attachment })
      toast.success("File sent!")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Render attachment in message bubble
  const renderAttachment = (msg: any) => {
    if (!msg.attachment_url) return null

    if (msg.attachment_type === "image") {
      return (
        <div className="mt-2 rounded-lg overflow-hidden max-w-[260px]">
          <img
            src={msg.attachment_url}
            alt="Shared image"
            className="w-full h-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
            onClick={() => window.open(msg.attachment_url, "_blank")}
          />
        </div>
      )
    }

    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm p-2.5 hover:bg-white/20 transition-colors"
      >
        {msg.attachment_type === "video" ? (
          <Video className="size-4 shrink-0" />
        ) : (
          <FileText className="size-4 shrink-0" />
        )}
        <span className="text-xs font-medium truncate">Attachment</span>
        <Download className="size-3 shrink-0 ml-auto" />
      </a>
    )
  }

  // If in a call, show the call UI
  if (callMode) {
    return (
      <VideoCall
        conversationId={conversationId}
        recipient={recipient}
        profile={profile}
        mode={callMode}
        onEnd={() => setCallMode(null)}
      />
    )
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-border bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Header with Call Buttons */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-surface-secondary/50">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary-light text-primary font-display font-semibold text-sm">
          {recipient?.full_name?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex flex-col flex-1">
          <span className="font-display text-sm font-bold text-on-surface">
            {recipient?.full_name || "Chat"}
          </span>
          <span className="font-body text-xs text-on-surface-muted capitalize">
            {recipient?.role || "Recipient"}
          </span>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setCallMode("audio")}
            aria-label="Start audio call"
            className="text-on-surface-muted hover:text-primary hover:bg-primary-light transition-colors"
          >
            <Phone className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setCallMode("video")}
            aria-label="Start video call"
            className="text-on-surface-muted hover:text-primary hover:bg-primary-light transition-colors"
          >
            <Video className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3 rounded-lg" />
            <Skeleton className="h-10 w-1/3 rounded-lg ml-auto bg-primary/20" />
            <Skeleton className="h-10 w-1/2 rounded-lg" />
          </div>
        ) : (
          messages?.map((msg: any) => {
            const isMe = msg.sender_id === profile.id
            const date = new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[70%] ${
                  isMe ? "ml-auto items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 font-body text-sm ${
                    isMe
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-surface-tertiary text-on-surface rounded-bl-none"
                  }`}
                >
                  {/* Don't show the auto-generated body if there's an image attachment */}
                  {(!msg.attachment_url || msg.attachment_type !== "image" || (msg.body !== "📷 Image")) && msg.body}
                  {renderAttachment(msg)}
                </div>
                <span className="mt-1 font-body text-[10px] text-on-surface-muted px-1">
                  {date}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray with Attachment */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border p-4 bg-surface-secondary/30"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileSelect}
        />

        {/* Attachment button */}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Attach file"
          className="text-on-surface-muted hover:text-primary shrink-0"
        >
          {isUploading ? (
            <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip className="size-4" />
          )}
        </Button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${recipient?.full_name || ""}`}
          className="flex-1 h-11 rounded-lg border border-border bg-surface px-4 font-body text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          disabled={sendMutation.isPending || isUploading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputText.trim() || sendMutation.isPending || isUploading}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
