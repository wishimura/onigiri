'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  TrendingUp,
  Settings,
} from 'lucide-react'

const navItems = [
  { name: 'ホーム', href: '/dashboard', icon: LayoutDashboard },
  { name: '実績', href: '/records', icon: ClipboardList },
  { name: '入力', href: '/records/new', icon: PlusCircle, primary: true },
  { name: '予測', href: '/predictions', icon: TrendingUp },
  { name: '設定', href: '/settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-200">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium text-orange-600 mt-0.5">{item.name}</span>
              </Link>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px]',
                isActive ? 'text-orange-600' : 'text-gray-400'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-orange-500')} />
              <span className={cn('text-[10px] font-medium', isActive && 'text-orange-600')}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
