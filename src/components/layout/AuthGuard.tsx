'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { BookOpen } from 'lucide-react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center animate-pulse">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <p className="text-surface-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 md:ml-[240px] pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
