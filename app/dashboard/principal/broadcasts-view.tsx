"use client"

import { useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Megaphone, Plus, ChevronDown } from "lucide-react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
} from "@/components/dashboard-card"
import { createAnnouncement, deleteAnnouncement } from "./actions"
import { getAnnouncementsPaginated } from "../announcements/actions"
import { AnnouncementCard } from "./announcement-card"
import { AnnouncementForm } from "./announcement-form"

export function BroadcastsView({
  profile,
}: {
  profile: { id: number; full_name: string; role: string }
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["announcements"],
    queryFn: ({ pageParam = 0 }) =>
      getAnnouncementsPaginated(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
  })

  const announcements = data?.pages.flatMap((p) => p.data) ?? []

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("Announcement created")
      setSheetOpen(false)
    },
    onError: () => toast.error("Failed to create announcement"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("Announcement deleted")
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard>
        <DashboardCardTitle icon={<Megaphone className="size-5 text-primary" />}>
          School Announcements
        </DashboardCardTitle>
        <DashboardCardValue>{profile.full_name}</DashboardCardValue>
        <p className="font-body text-sm text-on-surface-muted">
          Manage broadcasts to teachers, parents, and students
        </p>
      </DashboardCard>

      {profile.role === "principal" && (
        <div className="flex justify-end">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={<Button><Plus className="size-4" />New Announcement</Button>} />
            <SheetContent side="right" className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New Announcement</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <AnnouncementForm
                  profile={profile}
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                  onCancel={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </>
        ) : !announcements || announcements.length === 0 ? (
          <DashboardCard>
            <p className="font-body text-sm text-on-surface-muted p-4 text-center">
              No announcements yet. Create your first one!
            </p>
          </DashboardCard>
        ) : (
          <>
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={() => {}}
                onDelete={(id) => deleteMutation.mutate(id)}
                profile={profile}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <ChevronDown className="size-4 mr-2" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
