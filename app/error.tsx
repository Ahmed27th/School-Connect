'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <button onClick={reset}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  )
}
