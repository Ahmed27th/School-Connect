export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary motion-reduce:animate-none" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
