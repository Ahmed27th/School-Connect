import { requireAuth } from "@/lib/auth/guards"
import { getDriveClassContext } from "./actions"
import DriveClient from "./drive-client"
import { Providers } from "./providers"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function TeacherDrivePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ folderId?: string }>
}) {
  const profile = await requireAuth()
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const classId = resolvedParams.id
  const folderId = resolvedSearchParams.folderId

  const classData = await getDriveClassContext(classId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/classes" 
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="size-5 text-on-surface-muted" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {classData.name} - Drive
          </h1>
          <p className="font-body text-sm text-on-surface-muted">
            Manage course materials and resources
          </p>
        </div>
      </div>
      <Providers>
        <DriveClient 
          classId={classId} 
          folderId={folderId} 
          userRole={profile.role} 
        />
      </Providers>
    </div>
  )
}
