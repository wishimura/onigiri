'use client'

import { Sidebar } from './sidebar'
import { Toaster } from '@/components/ui/sonner'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
