'use client'

import { useState, useEffect } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { subscribeCompromissos, addCompromisso, updateCompromisso, deleteCompromisso } from '@/lib/db'
import type { Compromisso } from '@/types'
import Modal from '@/components/ui/Modal'
import { Plus, ChevronLeft, ChevronRight, Clock, Check, Trash2, Pencil } from 'lucide-react'
import { format, addDays, subDays, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const CORES = ['#6470f3','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']

interface FormData {
  titulo: string
  descricao: string
  hora: string
  cor: string
}

export default function AgendaPage() {
  const { user } = useAuth()
  const [data, setData]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [compromissos, setComp]   = useState<Compromisso[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<FormData>({ titulo: '', descricao: '', hora: '', cor: CORES[0] })
  const [salvando, setSalvando]   = useState(false)
  const [editando, setEditando]   = useState<Compromisso | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeCompromissos(user.uid, data, setComp)
  }, [user, data])

  const navData = (dir: 1 | -1) => {
    setData(d => format(dir === 1 ? addDays(parseISO(d), 1) : subDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  const handleSalvar = async () => {
    if (!form.titulo.trim() || !user) return
    setSalvando(true)
    try {
      if (editando) {
        await updateCompromisso(editando.id, {
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim(),
          hora: form.hora,
          cor: form.cor,
        })
      } else await addCompromisso({
        userId:    user.uid,
        titulo:    form.titulo.trim(),
        descricao: form.descricao.trim(),
        hora:      form.hora,
        cor:       form.cor,
        data,
        concluido: false,
        criadoEm:  Date.now(),
      })
      toast.success(editando ? 'Compromisso atualizado!' : 'Compromisso adicionado!')
      setModalOpen(false)
      setEditando(null)
      setForm({ titulo: '', descricao: '', hora: '', cor: CORES[0] })
    } catch {
      toast.error('Não foi possível salvar o compromisso. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const toggleConcluido = async (c: Compromisso) => {
    try { await updateCompromisso(c.id, { concluido: !c.concluido }) }
    catch { toast.error('Não foi possível atualizar o compromisso.') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este compromisso?')) return
    try {
      await deleteCompromisso(id)
      toast.success('Compromisso removido.')
    } catch { toast.error('Não foi possível excluir o compromisso.') }
  }

  const dateLabel = isToday(parseISO(data))
    ? 'Hoje'
    : format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <AuthGuard>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 font-display capitalize">{dateLabel}</h1>
            <p className="text-surface-400 text-sm mt-0.5">{compromissos.length} compromisso{compromissos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navData(-1)} className="btn-ghost p-2">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setData(format(new Date(), 'yyyy-MM-dd'))}
              className="btn-ghost text-xs px-3 py-2"
            >
              Hoje
            </button>
            <button onClick={() => navData(1)} className="btn-ghost p-2">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditando(null); setForm({ titulo: '', descricao: '', hora: '', cor: CORES[0] }); setModalOpen(true) }} className="btn-primary flex items-center gap-2 ml-2">
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>
        </div>

        {/* Date input */}
        <input
          type="date"
          value={data}
          aria-label="Escolher data dos compromissos"
          onChange={e => { if (e.target.value) setData(e.target.value) }}
          className="input mb-6 w-auto"
        />

        {/* List */}
        {compromissos.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-medium">Nenhum compromisso para este dia</p>
            <p className="text-sm mt-1">Clique em "Novo" para adicionar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {compromissos.map(c => (
              <div
                key={c.id}
                className={clsx(
                  'card p-4 flex items-start gap-4 group transition-all animate-slide-up',
                  c.concluido && 'opacity-60'
                )}
              >
                {/* Color bar */}
                <div className="w-1 h-12 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: c.cor }} />

                {/* Check */}
                <button
                  aria-label={c.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}
                  onClick={() => toggleConcluido(c)}
                  className={clsx(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors',
                    c.concluido
                      ? 'bg-brand-600 border-brand-600'
                      : 'border-surface-300 hover:border-brand-400'
                  )}
                >
                  {c.concluido && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-medium text-surface-900', c.concluido && 'line-through')}>
                    {c.titulo}
                  </p>
                  {c.descricao && (
                    <p className="text-sm text-surface-500 mt-0.5">{c.descricao}</p>
                  )}
                  {c.hora && (
                    <div className="flex items-center gap-1 text-xs text-surface-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {c.hora}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  aria-label="Editar compromisso"
                  onClick={() => { setEditando(c); setForm({ titulo: c.titulo, descricao: c.descricao || '', hora: c.hora || '', cor: c.cor }); setModalOpen(true) }}
                  className="p-1.5 text-surface-400 hover:text-brand-600 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  aria-label="Excluir compromisso"
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-surface-400 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar compromisso' : 'Novo compromisso'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Título *</label>
            <input
              className="input"
              placeholder="Nome do compromisso"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
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
            <label className="text-xs font-medium text-surface-600 mb-1 block">Horário</label>
            <input
              type="time"
              className="input"
              value={form.hora}
              onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-2 block">Cor</label>
            <div className="flex gap-2">
              {CORES.map(cor => (
                <button
                  key={cor}
                  onClick={() => setForm(f => ({ ...f, cor }))}
                  className={clsx(
                    'w-7 h-7 rounded-full transition-all',
                    form.cor === cor && 'ring-2 ring-offset-2 ring-surface-400 scale-110'
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSalvar} disabled={salvando || !form.titulo.trim()} className="btn-primary">
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  )
}
