'use client'

import { Sidebar } from '@/components/layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </QueryClientProvider>
  )
}
