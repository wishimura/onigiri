'use client'

import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { Toaster } from '@/components/ui/sonner'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-4 pb-20 md:px-8 md:py-8 md:pb-8">
          {children}
        </div>
      </main>
      <BottomNav />
      <Toaster position="top-right" richColors />
    </div>
  )
}
