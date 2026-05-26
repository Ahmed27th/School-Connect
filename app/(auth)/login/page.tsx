import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-on-surface">
            School Connect
          </h1>
          <p className="mt-2 text-sm text-on-surface-muted">
            Sign in to your account
          </p>
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-on-surface">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@school.edu"
              required
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-on-surface">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign In
          </button>
        </form>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 pt-6 border-t border-border">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-on-surface-muted text-center">
              Fast Dev Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <form action={login}>
                <input type="hidden" name="email" value="sarah@sunrise.edu" />
                <input type="hidden" name="password" value="Demo@123" />
                <button type="submit" className="w-full rounded-lg bg-surface-tertiary border border-border px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors shadow-sm">
                  👑 Principal
                </button>
              </form>
              <form action={login}>
                <input type="hidden" name="email" value="emily@sunrise.edu" />
                <input type="hidden" name="password" value="Demo@123" />
                <button type="submit" className="w-full rounded-lg bg-surface-tertiary border border-border px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors shadow-sm">
                  👩‍🏫 Teacher
                </button>
              </form>
              <form action={login}>
                <input type="hidden" name="email" value="alice.parent@sunrise.edu" />
                <input type="hidden" name="password" value="Demo@123" />
                <button type="submit" className="w-full rounded-lg bg-surface-tertiary border border-border px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors shadow-sm">
                  👩‍👦 Parent
                </button>
              </form>
              <form action={login}>
                <input type="hidden" name="email" value="student1@sunrise.edu" />
                <input type="hidden" name="password" value="Demo@123" />
                <button type="submit" className="w-full rounded-lg bg-surface-tertiary border border-border px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors shadow-sm">
                  🎒 Student
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
