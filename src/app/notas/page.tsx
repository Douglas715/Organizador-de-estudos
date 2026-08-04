'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeCadernos, addCaderno, updateCaderno, deleteCaderno,
  subscribePaginas, addPagina, updatePagina, deletePagina,
} from '@/lib/db'
import type { Caderno, Pagina } from '@/types'
import RichEditor from '@/components/notas/RichEditor'
import Modal from '@/components/ui/Modal'
import { Plus, Book, FileText, Trash2, ChevronRight, ChevronLeft, PanelLeft, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const EMOJIS = ['📚','📖','🧠','✏️','🔬','🎨','🎵','💻','🌍','⚡','🔭','📐']
const CORES_CADERNO = ['#6470f3','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

export default function NotasPage() {
  const { user } = useAuth()
  const [cadernos, setCadernos]             = useState<Caderno[]>([])
  const [paginas, setPaginas]               = useState<Pagina[]>([])
  const [cadernoAtivo, setCadernoAtivo]     = useState<Caderno | null>(null)
  const [paginaAtiva, setPaginaAtiva]       = useState<Pagina | null>(null)
  const [modalCaderno, setModalCaderno]     = useState(false)
  const [novoCadernoForm, setNovoCadernoForm] = useState({ titulo: '', emoji: '📚', cor: CORES_CADERNO[0] })
  const [salvando, setSalvando]             = useState(false)
  const [autoSaveLabel, setAutoSaveLabel]   = useState<string>('')
  const [painelAberto, setPainelAberto]     = useState(true)
  const [renomeandoId, setRenomeandoId]     = useState<string | null>(null)
  const [renomeandoValor, setRenomeandoValor] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Ao abrir uma página, fecha automaticamente os painéis de navegação
  // para dar mais espaço à escrita (pode ser reaberto pelo botão do cabeçalho)
  useEffect(() => {
    if (paginaAtiva) setPainelAberto(false)
  }, [paginaAtiva?.id])

  const iniciarRenomeacao = (c: Caderno) => {
    setRenomeandoId(c.id)
    setRenomeandoValor(c.titulo)
  }

  const confirmarRenomeacao = async () => {
    if (!renomeandoId || !renomeandoValor.trim()) { setRenomeandoId(null); return }
    await updateCaderno(renomeandoId, { titulo: renomeandoValor.trim(), atualizadoEm: Date.now() })
    setRenomeandoId(null)
    toast.success('Caderno renomeado!')
  }

  // subscribe cadernos
  useEffect(() => {
    if (!user) return
    return subscribeCadernos(user.uid, cadernos => {
      setCadernos(cadernos)
      if (cadernos.length > 0 && !cadernoAtivo) setCadernoAtivo(cadernos[0])
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // subscribe paginas when caderno changes
  useEffect(() => {
    if (!user || !cadernoAtivo) return
    return subscribePaginas(user.uid, cadernoAtivo.id, paginas => {
      setPaginas(paginas)
      if (paginas.length > 0) {
        setPaginaAtiva(prev =>
          prev && paginas.find(p => p.id === prev.id)
            ? paginas.find(p => p.id === prev.id)!
            : paginas[0]
        )
      } else {
        setPaginaAtiva(null)
      }
    })
  }, [user, cadernoAtivo])

  const handleEditorChange = useCallback((json: string) => {
    if (!paginaAtiva) return
    setPaginaAtiva(p => p ? { ...p, conteudo: json } : p)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await updatePagina(paginaAtiva.id, { conteudo: json, atualizadoEm: Date.now() })
      setAutoSaveLabel('Salvo automaticamente')
      setTimeout(() => setAutoSaveLabel(''), 2000)
    }, 1200)
  }, [paginaAtiva])

  const criarCaderno = async () => {
    if (!novoCadernoForm.titulo.trim() || !user) return
    setSalvando(true)
    try {
      const ref = await addCaderno({
        userId: user.uid,
        titulo: novoCadernoForm.titulo.trim(),
        emoji: novoCadernoForm.emoji,
        cor: novoCadernoForm.cor,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      })
      toast.success('Caderno criado!')
      setModalCaderno(false)
      setNovoCadernoForm({ titulo: '', emoji: '📚', cor: CORES_CADERNO[0] })
    } finally {
      setSalvando(false)
    }
  }

  const criarPagina = async () => {
    if (!user || !cadernoAtivo) return
    const ref = await addPagina({
      userId: user.uid,
      cadernoId: cadernoAtivo.id,
      titulo: 'Nova página',
      conteudo: '',
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
    })
    toast.success('Página criada!')
  }

  const salvarTituloPagina = async (pagina: Pagina, titulo: string) => {
    await updatePagina(pagina.id, { titulo, atualizadoEm: Date.now() })
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">

        {/* Painéis de navegação (cadernos + páginas) — colapsáveis para dar espaço à escrita */}
        <div
          className={clsx(
            'flex flex-shrink-0 overflow-hidden transition-all duration-200 ease-in-out',
            painelAberto ? 'w-[416px]' : 'w-0'
          )}
        >
          {/* Sidebar cadernos */}
          <aside className="w-56 border-r border-surface-200 bg-white flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Cadernos</span>
              <button
                onClick={() => setModalCaderno(true)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2">
              {cadernos.length === 0 && (
                <p className="text-xs text-surface-400 text-center py-6 px-2">
                  Crie seu primeiro caderno
                </p>
              )}
              {cadernos.map(c => (
                renomeandoId === c.id ? (
                  <div key={c.id} className="w-full flex items-center gap-1.5 px-2 py-1.5">
                    <span className="text-base">{c.emoji}</span>
                    <input
                      autoFocus
                      className="flex-1 min-w-0 text-sm bg-surface-50 border border-brand-200 rounded-lg px-2 py-1 outline-none"
                      value={renomeandoValor}
                      onChange={e => setRenomeandoValor(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmarRenomeacao()
                        if (e.key === 'Escape') setRenomeandoId(null)
                      }}
                      onBlur={confirmarRenomeacao}
                    />
                    <button onMouseDown={e => e.preventDefault()} onClick={confirmarRenomeacao} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-md">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => setRenomeandoId(null)} className="p-1 text-surface-400 hover:bg-surface-100 rounded-md">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    key={c.id}
                    onClick={() => { setCadernoAtivo(c); setPaginaAtiva(null) }}
                    onDoubleClick={() => iniciarRenomeacao(c)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all group',
                      cadernoAtivo?.id === c.id
                        ? 'bg-surface-100 text-surface-900 font-medium'
                        : 'text-surface-600 hover:bg-surface-50'
                    )}
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="flex-1 truncate text-left">{c.titulo}</span>
                    <button
                      onClick={e => { e.stopPropagation(); iniciarRenomeacao(c) }}
                      title="Renomear caderno"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-brand-500 transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteCaderno(c.id); toast.success('Caderno excluído') }}
                      title="Excluir caderno"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                )
              ))}
            </div>
          </aside>

          {/* Sidebar páginas */}
          <aside className="w-[160px] border-r border-surface-200 bg-surface-50/50 flex flex-col flex-shrink-0">
            {cadernoAtivo ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{cadernoAtivo.emoji}</span>
                    <span className="text-xs font-semibold text-surface-600 truncate">{cadernoAtivo.titulo}</span>
                  </div>
                  <button
                    onClick={criarPagina}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-200 text-surface-400 hover:text-brand-600 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2 px-2">
                  {paginas.length === 0 && (
                    <p className="text-xs text-surface-400 text-center py-6 px-2">
                      Nenhuma página ainda
                    </p>
                  )}
                  {paginas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPaginaAtiva(p)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-all group',
                        paginaAtiva?.id === p.id
                          ? 'bg-white text-surface-900 font-medium shadow-sm border border-surface-200'
                          : 'text-surface-500 hover:bg-surface-100'
                      )}
                    >
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1 truncate text-left">{p.titulo}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deletePagina(p.id); toast.success('Página excluída') }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-red-400"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-surface-300 text-center px-4">Selecione um caderno</p>
              </div>
            )}
          </aside>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {paginaAtiva ? (
            <>
              {/* Page header */}
              <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b border-surface-100 bg-white gap-2">
                <button
                  onClick={() => setPainelAberto(v => !v)}
                  title={painelAberto ? 'Fechar painel' : 'Abrir painel'}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors flex-shrink-0"
                >
                  {painelAberto ? <ChevronLeft className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
                <input
                  className="text-lg font-semibold text-surface-900 bg-transparent border-none outline-none flex-1 mr-4 font-display min-w-0"
                  value={paginaAtiva.titulo}
                  onChange={e => setPaginaAtiva(p => p ? { ...p, titulo: e.target.value } : p)}
                  onBlur={e => salvarTituloPagina(paginaAtiva, e.target.value)}
                />
                <span className={clsx(
                  'text-xs transition-opacity flex-shrink-0',
                  autoSaveLabel ? 'text-emerald-500 opacity-100' : 'text-surface-300 opacity-0'
                )}>
                  {autoSaveLabel || 'Salvo'}
                </span>
                <span className="text-xs text-surface-300 ml-3 flex-shrink-0 hidden sm:inline">
                  {formatDistanceToNow(paginaAtiva.atualizadoEm, { addSuffix: true, locale: ptBR })}
                </span>
              </div>

              {/* Rich Editor */}
              <div className="flex-1 overflow-hidden bg-white">
                <RichEditor
                  key={paginaAtiva.id}
                  content={paginaAtiva.conteudo}
                  onChange={handleEditorChange}
                  placeholder="Comece a escrever sua anotação..."
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-300 relative">
              {!painelAberto && (
                <button
                  onClick={() => setPainelAberto(true)}
                  className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
                  title="Abrir painel"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <Book className="w-12 h-12 mb-4 opacity-30" />
              {cadernoAtivo
                ? <p className="text-sm">Selecione ou crie uma página no painel ao lado</p>
                : <p className="text-sm">Selecione um caderno para começar</p>
              }
            </div>
          )}
        </div>
      </div>

      {/* Modal novo caderno */}
      <Modal open={modalCaderno} onClose={() => setModalCaderno(false)} title="Novo caderno" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Nome *</label>
            <input
              className="input"
              placeholder="Ex: Biologia, História, Programação..."
              value={novoCadernoForm.titulo}
              onChange={e => setNovoCadernoForm(f => ({ ...f, titulo: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') criarCaderno() }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-2 block">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setNovoCadernoForm(f => ({ ...f, emoji: em }))}
                  className={clsx(
                    'w-9 h-9 rounded-xl text-xl transition-all',
                    novoCadernoForm.emoji === em ? 'bg-brand-50 ring-2 ring-brand-300' : 'hover:bg-surface-100'
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalCaderno(false)} className="btn-ghost">Cancelar</button>
            <button onClick={criarCaderno} disabled={salvando || !novoCadernoForm.titulo.trim()} className="btn-primary">
              {salvando ? 'Criando...' : 'Criar caderno'}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  )
}
