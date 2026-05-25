"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"

interface DashboardCardContextValue {
  loading?: boolean
}

const DashboardCardContext = React.createContext<DashboardCardContextValue>({})

function useDashboardCard() {
  return React.useContext(DashboardCardContext)
}

function DashboardCard({
  className,
  loading,
  children,
  ...props
}: React.ComponentProps<"div"> & { loading?: boolean }) {
  return (
    <DashboardCardContext.Provider value={{ loading }}>
      <Card
        data-slot="dashboard-card"
        className={cn("bg-surface p-4 md:p-5", className)}
        {...props}
      >
        <CardContent className="flex flex-col gap-3 p-0">
          {children}
        </CardContent>
      </Card>
    </DashboardCardContext.Provider>
  )
}

function DashboardCardTitle({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  const { loading } = useDashboardCard()

  if (loading) {
    return <Skeleton className="h-5 w-28" />
  }

  return (
    <div
      data-slot="dashboard-card-title"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {icon ? (
        <span className="flex size-5 items-center justify-center text-on-surface-muted">
          {icon}
        </span>
      ) : null}
      <span className="font-body text-sm font-medium text-on-surface-muted" role="heading" aria-level={3}>
        {children}
      </span>
    </div>
  )
}

function DashboardCardValue({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { loading } = useDashboardCard()

  if (loading) {
    return <Skeleton className="h-9 w-24" />
  }

  return (
    <div
      data-slot="dashboard-card-value"
      className={cn(
        "font-display text-3xl font-bold leading-none tracking-tight text-on-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DashboardCardTrend({
  className,
  direction,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  direction: "up" | "down"
}) {
  const { loading } = useDashboardCard()
  const isUp = direction === "up"

  if (loading) {
    return <Skeleton className="h-4 w-20" />
  }

  return (
    <div
      data-slot="dashboard-card-trend"
      data-direction={direction}
      className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isUp ? "text-success" : "text-error",
        className
      )}
      {...props}
    >
      {isUp ? (
        <TrendingUp className="size-4" aria-hidden />
      ) : (
        <TrendingDown className="size-4" aria-hidden />
      )}
      <span>{children}</span>
    </div>
  )
}

function DashboardCardFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-card-footer"
      className={cn(
        "mt-auto flex items-center gap-2 border-t border-border pt-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardValue,
  DashboardCardTrend,
  DashboardCardFooter,
}
