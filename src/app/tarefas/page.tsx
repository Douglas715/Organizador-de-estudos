'use client'

import { useState, useEffect } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { subscribeTarefas, addTarefa, updateTarefa, deleteTarefa } from '@/lib/db'
import type { Tarefa } from '@/types'
import Modal from '@/components/ui/Modal'
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, Flag } from 'lucide-react'
import { format, addDays, subDays, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa',  color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { value: 'media', label: 'Média',  color: 'text-amber-500',   bg: 'bg-amber-50'   },
  { value: 'alta',  label: 'Alta',   color: 'text-red-500',     bg: 'bg-red-50'     },
] as const

interface FormData {
  titulo: string
  descricao: string
  prioridade: Tarefa['prioridade']
}

export default function TarefasPage() {
  const { user } = useAuth()
  const [data, setData]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [tarefas, setTarefas]     = useState<Tarefa[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<FormData>({ titulo: '', descricao: '', prioridade: 'media' })
  const [salvando, setSalvando]   = useState(false)

  useEffect(() => {
    if (!user) return
    return subscribeTarefas(user.uid, data, setTarefas)
  }, [user, data])

  const navData = (dir: 1 | -1) => {
    setData(d => format(dir === 1 ? addDays(parseISO(d), 1) : subDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  const concluidas  = tarefas.filter(t => t.concluida)
  const pendentes   = tarefas.filter(t => !t.concluida)
  const progresso   = tarefas.length ? Math.round((concluidas.length / tarefas.length) * 100) : 0

  const handleSalvar = async () => {
    if (!form.titulo.trim() || !user) return
    setSalvando(true)
    try {
      await addTarefa({
        userId:    user.uid,
        titulo:    form.titulo.trim(),
        descricao: form.descricao.trim(),
        prioridade: form.prioridade,
        data,
        concluida: false,
        criadoEm:  Date.now(),
      })
      toast.success('Tarefa adicionada!')
      setModalOpen(false)
      setForm({ titulo: '', descricao: '', prioridade: 'media' })
    } finally {
      setSalvando(false)
    }
  }

  const dateLabel = isToday(parseISO(data))
    ? 'Hoje'
    : format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <AuthGuard>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 font-display capitalize">{dateLabel}</h1>
            <p className="text-surface-400 text-sm mt-0.5">
              {concluidas.length}/{tarefas.length} tarefas concluídas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navData(-1)} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setData(format(new Date(), 'yyyy-MM-dd'))} className="btn-ghost text-xs px-3">Hoje</button>
            <button onClick={() => navData(1)} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 ml-2">
              <Plus className="w-4 h-4" />Nova
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {tarefas.length > 0 && (
          <div className="card p-4 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surface-700">Progresso do dia</span>
              <span className="text-sm font-bold text-brand-600">{progresso}%</span>
            </div>
            <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}

        {tarefas.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <div className="text-5xl mb-4">✅</div>
            <p className="font-medium">Nenhuma tarefa para este dia</p>
            <p className="text-sm mt-1">Clique em "Nova" para adicionar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-1">Pendentes</p>
                <div className="space-y-2">
                  {pendentes.map(t => <TarefaCard key={t.id} tarefa={t} />)}
                </div>
              </section>
            )}
            {/* Concluídas */}
            {concluidas.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-1">Concluídas</p>
                <div className="space-y-2">
                  {concluidas.map(t => <TarefaCard key={t.id} tarefa={t} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova tarefa">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Título *</label>
            <input
              className="input"
              placeholder="O que precisa ser feito?"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSalvar() }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Descrição</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Detalhes opcionais..."
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-2 block">Prioridade</label>
            <div className="flex gap-2">
              {PRIORIDADES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, prioridade: p.value }))}
                  className={clsx(
                    'flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                    form.prioridade === p.value
                      ? `${p.bg} ${p.color} border-current`
                      : 'border-surface-200 text-surface-400 hover:border-surface-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSalvar} disabled={salvando || !form.titulo.trim()} className="btn-primary">
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  )
}

function TarefaCard({ tarefa }: { tarefa: Tarefa }) {
  const pConfig = PRIORIDADES.find(p => p.value === tarefa.prioridade)!

  return (
    <div className={clsx(
      'card p-4 flex items-start gap-3 group transition-all animate-slide-up',
      tarefa.concluida && 'opacity-60'
    )}>
      <button
        onClick={() => updateTarefa(tarefa.id, { concluida: !tarefa.concluida })}
        className={clsx(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
          tarefa.concluida
            ? 'bg-brand-600 border-brand-600'
            : 'border-surface-300 hover:border-brand-400'
        )}
      >
        {tarefa.concluida && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium text-surface-900 text-sm', tarefa.concluida && 'line-through')}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && (
          <p className="text-xs text-surface-500 mt-0.5">{tarefa.descricao}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', pConfig.bg, pConfig.color)}>
          <Flag className="w-2.5 h-2.5 inline mr-0.5" />
          {pConfig.label}
        </span>
        <button
          onClick={() => { deleteTarefa(tarefa.id); toast.success('Removida.') }}
          className="opacity-0 group-hover:opacity-100 p-1 text-surface-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
