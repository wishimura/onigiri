'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { useStore, useStoreSetup } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function StoreSetup() {
  const [name, setName] = useState('')
  const { createStore, loading, error } = useStoreSetup()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const store = await createStore(name.trim())
    if (store) {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🍙</div>
          <CardTitle>店舗を登録しましょう</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="店舗名（例: おにぎり太郎 渋谷店）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? '作成中...' : '店舗を作成'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { store, loading } = useStore()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🍙</div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return <StoreSetup />
  }

  return <AppLayout>{children}</AppLayout>
}
