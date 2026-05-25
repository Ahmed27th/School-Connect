"use client"

import * as React from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-error/10">
          <ShieldAlert className="size-7 text-error" aria-hidden />
        </div>
        <h2 className="font-display text-xl font-semibold text-on-surface">
          Access Denied
        </h2>
        <p className="text-sm text-on-surface-muted">
          You do not have permission to view this page. Please contact your
          school administrator if you believe this is an error.
        </p>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

export default function RoleBoundary({
  role,
  allowedRoles,
  fallback,
  children,
}: {
  role: string | null
  allowedRoles: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback ?? <AccessDenied />}</>
  }

  return <>{children}</>
}
