"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageSquare, Plus, MessageCircle } from "lucide-react"
import { getConversations, getRecipientProfiles, startConversation } from "./actions"
import { ChatWindow } from "./chat-window"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"

export function MessagesDashboard({ profile }: { profile: any }) {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // 1. Fetch conversations
  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  })

  // 2. Fetch eligible messaging recipients
  const { data: recipients, isLoading: loadingRecipients } = useQuery({
    queryKey: ["recipients"],
    queryFn: getRecipientProfiles,
    enabled: modalOpen,
  })

  // 3. Mutation to start a conversation
  const startConvMutation = useMutation({
    mutationFn: startConversation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setSelectedConversationId(data.conversationId)
      setModalOpen(false)
      toast.success("Conversation started")
    },
    onError: () => toast.error("Failed to start conversation"),
  })

  const activeConversation = conversations?.find((c) => c.id === selectedConversationId)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Conversations List Sidebar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Chats
          </h2>
          <Sheet open={modalOpen} onOpenChange={setModalOpen}>
            <SheetTrigger render={<Button size="icon-sm"><Plus className="size-4" /></Button>} />
            <SheetContent side="right" className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New Message</SheetTitle>
              </SheetHeader>
              <div className="p-4 flex flex-col gap-3">
                <p className="font-body text-xs text-on-surface-muted mb-2">
                  Select a parent, teacher, or staff member to start messaging.
                </p>
                {loadingRecipients ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : !recipients || recipients.length === 0 ? (
                  <p className="font-body text-sm text-on-surface-muted text-center py-6">
                    No messaging recipients found.
                  </p>
                ) : (
                  recipients.map((rec: any) => (
                    <button
                      key={rec.id}
                      onClick={() => startConvMutation.mutate(rec.id)}
                      className="flex items-center gap-3 w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-surface-secondary"
                      disabled={startConvMutation.isPending}
                    >
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary-light text-primary font-display font-semibold text-xs">
                        {rec.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-display text-sm font-semibold text-on-surface">
                          {rec.full_name}
                        </span>
                        <span className="font-body text-xs text-on-surface-muted capitalize">
                          {rec.role}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px]">
          {loadingConvs ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <p className="font-body text-sm text-on-surface-muted text-center py-12">
              No active chats. Start one using the plus icon!
            </p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === selectedConversationId
              const lastMsgText = conv.lastMessage?.body || "Start chatting..."
              const senderPrefix = conv.lastMessage?.sender_id === profile.id ? "You: " : ""

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`flex items-center gap-3 w-full rounded-lg p-3 text-left transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "hover:bg-surface-secondary border border-border"
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-full font-display font-semibold text-sm ${
                      isActive ? "bg-white text-primary" : "bg-primary-light text-primary"
                    }`}
                  >
                    {conv.otherParticipant?.full_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className={`font-display text-sm font-bold truncate ${
                        isActive ? "text-white" : "text-on-surface"
                      }`}
                    >
                      {conv.otherParticipant?.full_name || "Direct Chat"}
                    </span>
                    <span
                      className={`font-body text-xs truncate ${
                        isActive ? "text-white/80" : "text-on-surface-muted"
                      }`}
                    >
                      {senderPrefix}
                      {lastMsgText}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Thread Panel */}
      <div className="lg:col-span-2">
        {selectedConversationId && activeConversation ? (
          <ChatWindow
            conversationId={selectedConversationId}
            recipient={activeConversation.otherParticipant}
            profile={profile}
          />
        ) : (
          <div className="flex h-[600px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <MessageCircle className="size-12 text-on-surface-muted" />
            <h3 className="font-display text-base font-bold text-on-surface">
              No Conversation Selected
            </h3>
            <p className="font-body text-sm text-on-surface-muted max-w-[280px]">
              Select a conversation from the list or start a new chat with school members.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
