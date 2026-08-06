'use client'

import { useState, useEffect, useMemo } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeRevisoes, addRevisao, revisarConteudo, deleteRevisao, removerBaralhoDaRevisao,
  subscribeBaralhos, addBaralho, updateBaralho, deleteBaralho,
} from '@/lib/db'
import type { Revisao, QualidadeRevisao, Baralho } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  Plus, RefreshCw, Trash2, Clock, AlertCircle, RotateCw,
  Play, X, Sparkles, ArrowLeft, Pencil, Layers, Inbox,
} from 'lucide-react'
import { format, parseISO, isToday, isPast, differenceInDays, isFuture } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const EMOJIS_BARALHO = ['📚', '🧠', '🔬', '🧮', '🌍', '⚖️', '💻', '🩺', '🎨', '🗣️', '📐', '⚗️']
const CORES_BARALHO  = ['#6470f3', '#f97066', '#22c3a6', '#f5a524', '#a855f7', '#3b82f6']

interface FormCartao { titulo: string; conteudo: string; verso: string; tags: string }
const FORM_VAZIO: FormCartao = { titulo: '', conteudo: '', verso: '', tags: '' }

export default function RevisoesPage() {
  const { user } = useAuth()
  const [revisoes, setRevisoes]   = useState<Revisao[]>([])
  const [baralhos, setBaralhos]   = useState<Baralho[]>([])
  const [baralhoAtivo, setBaralhoAtivo] = useState<Baralho | null>(null)

  const [modalCartao, setModalCartao]   = useState(false)
  const [modalBaralho, setModalBaralho] = useState(false)
  const [editandoBaralho, setEditandoBaralho] = useState<Baralho | null>(null)
  const [form, setForm]   = useState<FormCartao>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'hoje' | 'atrasadas' | 'futuras'>('hoje')
  const [modoEstudo, setModoEstudo] = useState(false)
  const [nomeBaralho, setNomeBaralho] = useState('')
  const [emojiBaralho, setEmojiBaralho] = useState(EMOJIS_BARALHO[0])
  const [corBaralho, setCorBaralho] = useState(CORES_BARALHO[0])

  useEffect(() => { if (user) return subscribeRevisoes(user.uid, setRevisoes) }, [user])
  useEffect(() => { if (user) return subscribeBaralhos(user.uid, setBaralhos) }, [user])

  // Mantém o baralho ativo sincronizado (ex: depois de renomear)
  useEffect(() => {
    if (!baralhoAtivo) return
    const atualizado = baralhos.find(b => b.id === baralhoAtivo.id)
    if (atualizado) setBaralhoAtivo(atualizado)
  }, [baralhos]) // eslint-disable-line react-hooks/exhaustive-deps

  const revisoesDoBaralho = useMemo(
    () => baralhoAtivo ? revisoes.filter(r => r.baralhoId === baralhoAtivo.id) : [],
    [revisoes, baralhoAtivo]
  )
  const semBaralhoCount = useMemo(() => revisoes.filter(r => !r.baralhoId).length, [revisoes])

  const contagemPorBaralho = (baralhoId: string) => {
    const doB = revisoes.filter(r => r.baralhoId === baralhoId)
    return {
      total: doB.length,
      hoje: doB.filter(r => isToday(parseISO(r.proximaRevisao)) || (isPast(parseISO(r.proximaRevisao)) && !isToday(parseISO(r.proximaRevisao)))).length,
    }
  }

  const abrirNovoBaralho = () => {
    setEditandoBaralho(null)
    setNomeBaralho('')
    setEmojiBaralho(EMOJIS_BARALHO[Math.floor(Math.random() * EMOJIS_BARALHO.length)])
    setCorBaralho(CORES_BARALHO[Math.floor(Math.random() * CORES_BARALHO.length)])
    setModalBaralho(true)
  }

  const abrirEditarBaralho = (b: Baralho, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditandoBaralho(b)
    setNomeBaralho(b.nome)
    setEmojiBaralho(b.emoji)
    setCorBaralho(b.cor)
    setModalBaralho(true)
  }

  const salvarBaralho = async () => {
    if (!nomeBaralho.trim() || !user) return
    setSalvando(true)
    try {
      if (editandoBaralho) {
        await updateBaralho(editandoBaralho.id, { nome: nomeBaralho.trim(), emoji: emojiBaralho, cor: corBaralho })
        toast.success('Baralho atualizado!')
      } else {
        await addBaralho({
          userId: user.uid, nome: nomeBaralho.trim(), emoji: emojiBaralho, cor: corBaralho, criadoEm: Date.now(),
        })
        toast.success('Baralho criado!')
      }
      setModalBaralho(false)
    } finally {
      setSalvando(false)
    }
  }

  const excluirBaralho = async (b: Baralho, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Excluir o baralho "${b.nome}"? Os cartões dele voltarão para "Sem baralho".`)) return
    // move os cartões desse baralho para "sem baralho" antes de excluir
    const cartoes = revisoes.filter(r => r.baralhoId === b.id)
    await Promise.all(cartoes.map(r => removerBaralhoDaRevisao(r.id)))
    await deleteBaralho(b.id)
    toast.success('Baralho excluído')
  }

  const handleSalvarCartao = async () => {
    if (!form.titulo.trim() || !user) return
    setSalvando(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await addRevisao({
        userId: user.uid,
        ...(baralhoAtivo?.id ? { baralhoId: baralhoAtivo.id } : {}),
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        verso: form.verso.trim(),
        tags,
        proximaRevisao: format(new Date(), 'yyyy-MM-dd'),
        intervalo: 1,
        repeticoes: 0,
        facilidade: 2.5,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      })
      toast.success('Cartão adicionado!')
      setModalCartao(false)
      setForm(FORM_VAZIO)
    } finally {
      setSalvando(false)
    }
  }

  // ── Tela: lista de baralhos ────────────────────────────────────────────────
  if (!baralhoAtivo) {
    return (
      <AuthGuard>
        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 font-display">Revisões</h1>
              <p className="text-surface-400 text-sm mt-0.5">Organize seus flashcards em baralhos, no estilo Anki</p>
            </div>
            <button onClick={abrirNovoBaralho} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo baralho
            </button>
          </div>

          {baralhos.length === 0 ? (
            <div className="text-center py-20 text-surface-400">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Você ainda não tem nenhum baralho</p>
              <p className="text-sm mt-1">Crie um baralho para organizar seus flashcards por matéria ou tema</p>
              <button onClick={abrirNovoBaralho} className="btn-primary mt-5">Criar meu primeiro baralho</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {baralhos.map(b => {
                const { total, hoje } = contagemPorBaralho(b.id)
                return (
                  <button
                    key={b.id}
                    onClick={() => setBaralhoAtivo(b)}
                    className="card p-4 text-left group relative overflow-hidden animate-slide-up hover:-translate-y-0.5 transition-transform"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
                      style={{ backgroundColor: `${b.cor}20` }}
                    >
                      {b.emoji}
                    </div>
                    <h3 className="font-semibold text-surface-900 truncate pr-10">{b.nome}</h3>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {total} cartão{total !== 1 ? 'ões' : ''}
                      {hoje > 0 && <span className="text-brand-600 font-medium"> · {hoje} para hoje</span>}
                    </p>
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => abrirEditarBaralho(b, e)} className="p-1.5 rounded-lg text-surface-300 hover:text-brand-600 hover:bg-surface-100">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => excluirBaralho(b, e)} className="p-1.5 rounded-lg text-surface-300 hover:text-red-400 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {semBaralhoCount > 0 && (
            <button
              onClick={() => setBaralhoAtivo({ id: '__sem_baralho__', userId: '', nome: 'Sem baralho', emoji: '📦', cor: '#94a3b8', criadoEm: 0 })}
              className="mt-6 flex items-center gap-3 text-sm text-surface-500 hover:text-surface-800 transition-colors"
            >
              <Inbox className="w-4 h-4" />
              {semBaralhoCount} cartão{semBaralhoCount !== 1 ? 'ões' : ''} sem baralho — ver e organizar
            </button>
          )}
        </div>

        <ModalBaralho
          open={modalBaralho}
          editando={!!editandoBaralho}
          nome={nomeBaralho} setNome={setNomeBaralho}
          emoji={emojiBaralho} setEmoji={setEmojiBaralho}
          cor={corBaralho} setCor={setCorBaralho}
          salvando={salvando}
          onClose={() => setModalBaralho(false)}
          onSalvar={salvarBaralho}
        />
      </AuthGuard>
    )
  }

  // ── Tela: dentro de um baralho ──────────────────────────────────────────────
  const isSemBaralho = baralhoAtivo.id === '__sem_baralho__'
  const listaBase = isSemBaralho ? revisoes.filter(r => !r.baralhoId) : revisoesDoBaralho

  const atrasadas = listaBase.filter(r => isPast(parseISO(r.proximaRevisao)) && !isToday(parseISO(r.proximaRevisao)))
  const paraHoje  = listaBase.filter(r => isToday(parseISO(r.proximaRevisao)))
  const futuras   = listaBase.filter(r => isFuture(parseISO(r.proximaRevisao)))
  const filaEstudo = [...atrasadas, ...paraHoje]

  const listaFiltrada = { todas: listaBase, hoje: paraHoje, atrasadas, futuras }[filtro]

  return (
    <AuthGuard>
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => setBaralhoAtivo(null)}
          className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Todos os baralhos
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${baralhoAtivo.cor}20` }}>
              {baralhoAtivo.emoji}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 font-display">{baralhoAtivo.nome}</h1>
              <p className="text-surface-400 text-sm mt-0.5">Repetição espaçada estilo Anki (SM-2)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filaEstudo.length > 0 && (
              <button onClick={() => setModoEstudo(true)} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                Estudar agora ({filaEstudo.length})
              </button>
            )}
            {!isSemBaralho && (
              <button onClick={() => setModalCartao(true)} className="btn-ghost flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo cartão
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Para hoje" value={paraHoje.length} icon={<Clock className="w-4 h-4" />} color="text-brand-600" bg="bg-brand-50" />
          <StatCard label="Atrasadas" value={atrasadas.length} icon={<AlertCircle className="w-4 h-4" />} color="text-red-500" bg="bg-red-50" />
          <StatCard label="Total" value={listaBase.length} icon={<RefreshCw className="w-4 h-4" />} color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: 'hoje',      label: `Hoje (${paraHoje.length})`      },
            { key: 'atrasadas', label: `Atrasadas (${atrasadas.length})` },
            { key: 'futuras',   label: `Futuras (${futuras.length})`     },
            { key: 'todas',     label: `Todas (${listaBase.length})`     },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={clsx(
                'text-sm px-4 py-1.5 rounded-xl font-medium transition-all',
                filtro === f.key ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {listaFiltrada.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <div className="text-5xl mb-4">🧠</div>
            <p className="font-medium">
              {filtro === 'hoje' ? 'Nenhuma revisão para hoje!' : 'Nenhum conteúdo neste filtro'}
            </p>
            {filtro === 'hoje' && <p className="text-sm mt-1 text-emerald-500">Você está em dia com esse baralho 🎉</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {listaFiltrada.map(r => <RevisaoCard key={r.id} revisao={r} />)}
          </div>
        )}
      </div>

      <Modal open={modalCartao} onClose={() => setModalCartao(false)} title={`Novo cartão em "${baralhoAtivo.nome}"`}>
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
            <label className="text-xs font-medium text-surface-600 mb-1 block">Frente (pergunta)</label>
            <textarea
              className="input resize-none" rows={3}
              placeholder="O que você quer se perguntar na revisão..."
              value={form.conteudo}
              onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Verso (resposta)</label>
            <textarea
              className="input resize-none" rows={3}
              placeholder="A resposta que só aparece depois de você tentar lembrar..."
              value={form.verso}
              onChange={e => setForm(f => ({ ...f, verso: e.target.value }))}
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
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalCartao(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSalvarCartao} disabled={salvando || !form.titulo.trim()} className="btn-primary">
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>

      {modoEstudo && <ModoEstudo fila={filaEstudo} onFechar={() => setModoEstudo(false)} />}
    </AuthGuard>
  )
}

function ModalBaralho({
  open, editando, nome, setNome, emoji, setEmoji, cor, setCor, salvando, onClose, onSalvar,
}: {
  open: boolean; editando: boolean
  nome: string; setNome: (v: string) => void
  emoji: string; setEmoji: (v: string) => void
  cor: string; setCor: (v: string) => void
  salvando: boolean; onClose: () => void; onSalvar: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar baralho' : 'Novo baralho'}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1 block">Nome *</label>
          <input
            className="input"
            placeholder="Ex: Biologia, Inglês, Direito Civil..."
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS_BARALHO.map(em => (
              <button
                key={em}
                onClick={() => setEmoji(em)}
                className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 transition-colors',
                  emoji === em ? 'border-brand-500 bg-brand-50' : 'border-transparent bg-surface-100 hover:bg-surface-200'
                )}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">Cor</label>
          <div className="flex gap-2">
            {CORES_BARALHO.map(c => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={clsx('w-7 h-7 rounded-full border-2 transition-transform', cor === c ? 'scale-110 border-surface-900' : 'border-white')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando || !nome.trim()} className="btn-primary">
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar baralho'}
          </button>
        </div>
      </div>
    </Modal>
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

function RevisaoCard({ revisao }: { revisao: Revisao }) {
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
        {revisao.conteudo && <p className="text-sm text-surface-500 line-clamp-2 mb-2">{revisao.conteudo}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          {revisao.tags.map(tag => (
            <span key={tag} className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
          <span className="text-xs text-surface-400">
            {revisao.repeticoes} revisão{revisao.repeticoes !== 1 ? 'ões' : ''} · intervalo {revisao.intervalo}d · facilidade {(revisao.facilidade ?? 2.5).toFixed(2)}
          </span>
        </div>
      </div>
      <button
        onClick={() => { deleteRevisao(revisao.id); toast.success('Removido.') }}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function ModoEstudo({ fila, onFechar }: { fila: Revisao[]; onFechar: () => void }) {
  const [indice, setIndice] = useState(0)
  const [revelado, setRevelado] = useState(false)
  const [concluidos, setConcluidos] = useState(0)

  const cartao = fila[indice]
  const acabou = !cartao

  const avaliar = async (qualidade: QualidadeRevisao) => {
    if (!cartao) return
    await revisarConteudo(cartao, qualidade)
    setConcluidos(c => c + 1)
    setRevelado(false)
    setIndice(i => i + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!revelado) setRevelado(true) }
      if (revelado) {
        if (e.key === '1') avaliar('errei')
        if (e.key === '2') avaliar('dificil')
        if (e.key === '3') avaliar('bom')
        if (e.key === '4') avaliar('facil')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revelado, cartao])

  return (
    <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <RotateCw className="w-4 h-4" />
            {acabou ? 'Sessão concluída' : `Cartão ${indice + 1} de ${fila.length}`}
          </div>
          <button onClick={onFechar} className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {acabou ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Sparkles className="w-10 h-10 text-brand-500 mb-3" />
            <h3 className="text-lg font-semibold text-surface-900">Tudo revisado por aqui! 🎉</h3>
            <p className="text-sm text-surface-400 mt-1">Você concluiu {concluidos} cartão{concluidos !== 1 ? 's' : ''}.</p>
            <button onClick={onFechar} className="btn-primary mt-6">Fechar</button>
          </div>
        ) : (
          <>
            <div className="min-h-[240px] flex flex-col items-center justify-center px-8 py-10 cursor-pointer select-none" onClick={() => setRevelado(true)}>
              <span className="text-xs uppercase tracking-wider text-surface-300 mb-3">{revelado ? 'Verso' : 'Frente'}</span>
              <h3 className="text-xl font-semibold text-surface-900 text-center font-display mb-2">{cartao.titulo}</h3>
              {!revelado ? (
                <>
                  {cartao.conteudo && <p className="text-surface-500 text-center whitespace-pre-wrap">{cartao.conteudo}</p>}
                  <span className="text-xs text-surface-300 mt-6">Clique ou pressione espaço para revelar</span>
                </>
              ) : (
                <p className="text-surface-700 text-center whitespace-pre-wrap">
                  {cartao.verso || cartao.conteudo || 'Sem resposta cadastrada para este cartão.'}
                </p>
              )}
            </div>

            <div className="border-t border-surface-100 p-4">
              {!revelado ? (
                <button onClick={() => setRevelado(true)} className="btn-primary w-full">Mostrar resposta</button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => avaliar('errei')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors">
                    Errei<span className="text-[10px] text-red-400">1</span>
                  </button>
                  <button onClick={() => avaliar('dificil')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-medium transition-colors">
                    Difícil<span className="text-[10px] text-amber-400">2</span>
                  </button>
                  <button onClick={() => avaliar('bom')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 text-xs font-medium transition-colors">
                    Bom<span className="text-[10px] text-brand-400">3</span>
                  </button>
                  <button onClick={() => avaliar('facil')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium transition-colors">
                    Fácil<span className="text-[10px] text-emerald-400">4</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
