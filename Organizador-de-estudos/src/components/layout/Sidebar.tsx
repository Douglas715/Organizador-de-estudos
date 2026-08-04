'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen, Calendar, FileText, CheckSquare, RefreshCw, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

const links = [
  { href: '/agenda',  label: 'Agenda',   icon: Calendar    },
  { href: '/notas',   label: 'Notas',    icon: FileText    },
  { href: '/tarefas', label: 'Tarefas',  icon: CheckSquare },
  { href: '/revisoes',label: 'Revisões', icon: RefreshCw   },
]

export default function Sidebar() {
  const pathname     = usePathname()
  const { user, signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-white border-r border-surface-200 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg text-surface-900">StudyFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-brand-50 text-brand-700 border border-brand-100'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )}
            >
              <Icon className={clsx('w-4 h-4', active ? 'text-brand-600' : 'text-surface-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-surface-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          {user?.photoURL && (
            <Image
              src={user.photoURL}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">
              {user?.displayName?.split(' ')[0]}
            </p>
            <p className="text-xs text-surface-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-surface-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
