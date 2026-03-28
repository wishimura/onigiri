'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Upload,
  TrendingUp,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '日次入力', href: '/records/new', icon: PlusCircle },
  { name: '実績一覧', href: '/records', icon: ClipboardList },
  { name: 'CSV取込', href: '/records/import', icon: Upload },
  { name: '予測履歴', href: '/predictions', icon: TrendingUp },
  { name: '設定', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
      <aside
        className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200"
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="text-2xl">🍙</span>
          <span className="font-bold text-lg">おにぎり予測</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-orange-600' : 'text-gray-400')} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            ログアウト
          </button>
        </div>
      </aside>
  )
}
