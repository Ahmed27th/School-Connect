'use client'

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-on-surface-muted">{error.message}</p>
      <button onClick={reset}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        Try again
      </button>
    </div>
  )
}
