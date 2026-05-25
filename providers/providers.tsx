"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

let queryClient: QueryClient | undefined

function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    })
  }
  return queryClient
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const client = getQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
