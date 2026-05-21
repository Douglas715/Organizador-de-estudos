'use client'

import { useState, useEffect } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { subscribeRevisoes, addRevisao, revisarConteudo, deleteRevisao } from '@/lib/db'
import type { Revisao } from '@/types'
import Modal from '@/components/ui/Modal'
import { Plus, RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { format, parseISO, isToday, isPast, differenceInDays, isFuture } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

interface FormData {
  titulo: string
  conteudo: string
  tags: string
}

export default function RevisoesPage() {
  const { user } = useAuth()
  const [revisoes, setRevisoes]   = useState<Revisao[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<FormData>({ titulo: '', conteudo: '', tags: '' })
  const [salvando, setSalvando]   = useState(false)
  const [filtro, setFiltro]       = useState<'todas' | 'hoje' | 'atrasadas' | 'futuras'>('hoje')

  useEffect(() => {
    if (!user) return
    return subscribeRevisoes(user.uid, setRevisoes)
  }, [user])

  const hoje      = format(new Date(), 'yyyy-MM-dd')
  const atrasadas = revisoes.filter(r => isPast(parseISO(r.proximaRevisao)) && !isToday(parseISO(r.proximaRevisao)))
  const paraHoje  = revisoes.filter(r => isToday(parseISO(r.proximaRevisao)))
  const futuras   = revisoes.filter(r => isFuture(parseISO(r.proximaRevisao)))

  const listaFiltrada = {
    todas:     revisoes,
    hoje:      paraHoje,
    atrasadas: atrasadas,
    futuras:   futuras,
  }[filtro]

  const handleSalvar = async () => {
    if (!form.titulo.trim() || !user) return
    setSalvando(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await addRevisao({
        userId: user.uid,
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        tags,
        proximaRevisao: hoje,
        intervalo: 1,
        repeticoes: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      })
      toast.success('Conteúdo adicionado para revisão!')
      setModalOpen(false)
      setForm({ titulo: '', conteudo: '', tags: '' })
    } finally {
      setSalvando(false)
    }
  }

  const handleRevisar = async (r: Revisao) => {
    await revisarConteudo(r)
    toast.success('Ótimo! Próxima revisão agendada 🎉')
  }

  return (
    <AuthGuard>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 font-display">Revisões</h1>
            <p className="text-surface-400 text-sm mt-0.5">Repetição espaçada para memorização duradoura</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo conteúdo
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Para hoje"
            value={paraHoje.length}
            icon={<Clock className="w-4 h-4" />}
            color="text-brand-600"
            bg="bg-brand-50"
          />
          <StatCard
            label="Atrasadas"
            value={atrasadas.length}
            icon={<AlertCircle className="w-4 h-4" />}
            color="text-red-500"
            bg="bg-red-50"
          />
          <StatCard
            label="Total"
            value={revisoes.length}
            icon={<RefreshCw className="w-4 h-4" />}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'hoje',      label: `Hoje (${paraHoje.length})`      },
            { key: 'atrasadas', label: `Atrasadas (${atrasadas.length})` },
            { key: 'futuras',   label: `Futuras (${futuras.length})`     },
            { key: 'todas',     label: `Todas (${revisoes.length})`      },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={clsx(
                'text-sm px-4 py-1.5 rounded-xl font-medium transition-all',
                filtro === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {listaFiltrada.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <div className="text-5xl mb-4">🧠</div>
            <p className="font-medium">
              {filtro === 'hoje' ? 'Nenhuma revisão para hoje!' : 'Nenhum conteúdo neste filtro'}
            </p>
            {filtro === 'hoje' && (
              <p className="text-sm mt-1 text-emerald-500">Você está em dia com seus estudos 🎉</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {listaFiltrada.map(r => (
              <RevisaoCard key={r.id} revisao={r} onRevisar={handleRevisar} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo conteúdo para revisar">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Título *</label>
            <input
              className="input"
              placeholder="Ex: Fotossíntese, Lei de Newton, Big O notation..."
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Resumo / Anotação</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Pontos-chave para revisar..."
              value={form.conteudo}
              onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Tags (separadas por vírgula)</label>
            <input
              className="input"
              placeholder="biologia, célula, vestibular..."
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </div>
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-xs text-brand-700">
            <strong>Como funciona:</strong> O sistema agenda revisões automáticas usando repetição espaçada.
            Quanto mais você revisar, maior o intervalo entre as sessões (1 → 3 → 7 → 14 → 30 → 60 dias).
          </div>
          <div className="flex justify-end gap-2 pt-1">
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

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: number; icon: React.ReactNode; color: string; bg: string
}) {
  return (
    <div className="card p-4 flex items-center gap-3 animate-slide-up">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg, color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-surface-900">{value}</p>
        <p className="text-xs text-surface-400">{label}</p>
      </div>
    </div>
  )
}

function RevisaoCard({ revisao, onRevisar }: { revisao: Revisao; onRevisar: (r: Revisao) => void }) {
  const atrasada = isPast(parseISO(revisao.proximaRevisao)) && !isToday(parseISO(revisao.proximaRevisao))
  const paraHoje = isToday(parseISO(revisao.proximaRevisao))

  const statusColor = atrasada
    ? 'text-red-500 bg-red-50 border-red-100'
    : paraHoje
    ? 'text-brand-600 bg-brand-50 border-brand-100'
    : 'text-surface-500 bg-surface-50 border-surface-200'

  const statusLabel = atrasada
    ? `Atrasada ${differenceInDays(new Date(), parseISO(revisao.proximaRevisao))}d`
    : paraHoje
    ? 'Revisar hoje'
    : format(parseISO(revisao.proximaRevisao), "d 'de' MMM", { locale: ptBR })

  return (
    <div className="card p-4 flex items-start gap-4 group animate-slide-up">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-surface-900">{revisao.titulo}</h3>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', statusColor)}>
            {statusLabel}
          </span>
        </div>
        {revisao.conteudo && (
          <p className="text-sm text-surface-500 line-clamp-2 mb-2">{revisao.conteudo}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {revisao.tags.map(tag => (
            <span key={tag} className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
          <span className="text-xs text-surface-400">
            {revisao.repeticoes} revisão{revisao.repeticoes !== 1 ? 'ões' : ''} · intervalo {revisao.intervalo}d
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {(paraHoje || atrasada) && (
          <button
            onClick={() => onRevisar(revisao)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Revisei!
          </button>
        )}
        <button
          onClick={() => { deleteRevisao(revisao.id); toast.success('Removido.') }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
