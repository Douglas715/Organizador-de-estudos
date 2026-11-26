'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeCadernos, addCaderno, updateCaderno, deleteCaderno, moverCadernoParaPasta,
  subscribePastas, addPasta, updatePasta, deletePasta,
  subscribePaginas, addPagina, updatePagina, deletePagina,
} from '@/lib/db'
import type { Caderno, Pagina, Pasta } from '@/types'
import RichEditor from '@/components/notas/RichEditor'
import Modal from '@/components/ui/Modal'
import {
  Plus, Book, FileText, Trash2, ChevronRight, ChevronLeft, ChevronDown,
  PanelLeft, Pencil, Check, X, FolderPlus, FolderInput,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const EMOJIS = ['📚','📖','🧠','✏️','🔬','🎨','🎵','💻','🌍','⚡','🔭','📐']
const CORES_CADERNO = ['#6470f3','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
const EMOJIS_PASTA = ['🗂️','📁','🎓','📦','🗄️','📌']

const SEM_PASTA = '__sem_pasta__'

export default function NotasPage() {
  const { user } = useAuth()
  const [cadernos, setCadernos]             = useState<Caderno[]>([])
  const [pastas, setPastas]                 = useState<Pasta[]>([])
  const [paginas, setPaginas]               = useState<Pagina[]>([])
  const [cadernoAtivo, setCadernoAtivo]     = useState<Caderno | null>(null)
  const [paginaAtiva, setPaginaAtiva]       = useState<Pagina | null>(null)

  const [modalCaderno, setModalCaderno]     = useState(false)
  const [novoCadernoForm, setNovoCadernoForm] = useState({ titulo: '', emoji: '📚', cor: CORES_CADERNO[0], pastaId: undefined as string | undefined })

  const [modalPasta, setModalPasta]         = useState(false)
  const [editandoPasta, setEditandoPasta]   = useState<Pasta | null>(null)
  const [pastaForm, setPastaForm]           = useState({ nome: '', emoji: EMOJIS_PASTA[0] })

  const [salvando, setSalvando]             = useState(false)
  const [autoSaveLabel, setAutoSaveLabel]   = useState<string>('')
  const [painelAberto, setPainelAberto]     = useState(true)
  const [renomeandoId, setRenomeandoId]     = useState<string | null>(null)
  const [renomeandoValor, setRenomeandoValor] = useState('')
  const [pastasFechadas, setPastasFechadas] = useState<Set<string>>(new Set())
  const [movendoId, setMovendoId]           = useState<string | null>(null)
  const pendingSaves = useRef(new Map<string, { content: string; version: number; timer: ReturnType<typeof setTimeout> | null }>())
  const saveQueues = useRef(new Map<string, Promise<void>>())
  const mounted = useRef(true)

  const savePage = useCallback((id: string) => {
    const pending = pendingSaves.current.get(id)
    if (!pending) return
    if (pending.timer) clearTimeout(pending.timer)
    pending.timer = null
    const previous = saveQueues.current.get(id) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(async () => {
      const current = pendingSaves.current.get(id)
      if (!current) return
      const { content, version } = current
      await updatePagina(id, { conteudo: content, atualizadoEm: Date.now() })
      if (pendingSaves.current.get(id)?.version === version) {
        pendingSaves.current.delete(id)
      }
      if (mounted.current && pendingSaves.current.size === 0) setAutoSaveLabel('Salvo automaticamente')
    }).catch(() => {
      if (mounted.current) {
        setAutoSaveLabel('Não foi possível salvar')
        toast.error('Não foi possível salvar a anotação. Verifique a conexão e tente editar novamente.')
      }
    })
    saveQueues.current.set(id, next)
  }, [])

  useEffect(() => {
    mounted.current = true
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingSaves.current.size > 0) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      mounted.current = false
      window.removeEventListener('beforeunload', warn)
      pendingSaves.current.forEach((_, id) => savePage(id))
    }
  }, [savePage])

  // Ao abrir uma página, fecha automaticamente os painéis de navegação
  useEffect(() => {
    if (paginaAtiva) setPainelAberto(false)
  }, [paginaAtiva?.id])

  useEffect(() => {
    if (!user) return
    return subscribeCadernos(user.uid, cadernos => {
      setCadernos(cadernos)
      if (cadernos.length > 0 && !cadernoAtivo) setCadernoAtivo(cadernos[0])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribePastas(user.uid, setPastas)
  }, [user])

  useEffect(() => {
    if (!user || !cadernoAtivo) return
    return subscribePaginas(user.uid, cadernoAtivo.id, paginas => {
      paginas = paginas.map(p => {
        const pending = pendingSaves.current.get(p.id)
        return pending ? { ...p, conteudo: pending.content } : p
      })
      setPaginas(paginas)
      if (paginas.length > 0) {
        setPaginaAtiva(prev =>
          prev && paginas.find(p => p.id === prev.id) ? paginas.find(p => p.id === prev.id)! : paginas[0]
        )
      } else {
        setPaginaAtiva(null)
      }
    })
  }, [user, cadernoAtivo])

  const handleEditorChange = useCallback((json: string) => {
    if (!paginaAtiva) return
    setPaginaAtiva(p => p ? { ...p, conteudo: json } : p)
    const id = paginaAtiva.id
    const previous = pendingSaves.current.get(id)
    if (previous?.timer) clearTimeout(previous.timer)
    const version = (previous?.version ?? 0) + 1
    const timer = setTimeout(() => savePage(id), 1200)
    pendingSaves.current.set(id, { content: json, version, timer })
    setAutoSaveLabel('Salvando...')
  }, [paginaAtiva, savePage])

  // ── Cadernos ────────────────────────────────────────────────────────────────
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

  const abrirNovoCaderno = (pastaId?: string) => {
    setNovoCadernoForm({ titulo: '', emoji: '📚', cor: CORES_CADERNO[0], pastaId })
    setModalCaderno(true)
  }

  const criarCaderno = async () => {
    if (!novoCadernoForm.titulo.trim() || !user) return
    setSalvando(true)
    try {
      await addCaderno({
        userId: user.uid,
        ...(novoCadernoForm.pastaId ? { pastaId: novoCadernoForm.pastaId } : {}),
        titulo: novoCadernoForm.titulo.trim(),
        emoji: novoCadernoForm.emoji,
        cor: novoCadernoForm.cor,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      })
      toast.success('Caderno criado!')
      setModalCaderno(false)
    } catch (err) {
      console.error('Erro ao criar caderno:', err)
      toast.error('Não foi possível criar o caderno. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const criarPagina = async () => {
    if (!user || !cadernoAtivo) return
    await addPagina({
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

  // ── Pastas ──────────────────────────────────────────────────────────────────
  const abrirNovaPasta = () => {
    setEditandoPasta(null)
    setPastaForm({ nome: '', emoji: EMOJIS_PASTA[0] })
    setModalPasta(true)
  }

  const abrirEditarPasta = (p: Pasta) => {
    setEditandoPasta(p)
    setPastaForm({ nome: p.nome, emoji: p.emoji })
    setModalPasta(true)
  }

  const salvarPasta = async () => {
    if (!pastaForm.nome.trim() || !user) return
    setSalvando(true)
    try {
      if (editandoPasta) {
        await updatePasta(editandoPasta.id, { nome: pastaForm.nome.trim(), emoji: pastaForm.emoji })
        toast.success('Pasta atualizada!')
      } else {
        await addPasta({ userId: user.uid, nome: pastaForm.nome.trim(), emoji: pastaForm.emoji, criadoEm: Date.now() })
        toast.success('Pasta criada!')
      }
      setModalPasta(false)
    } catch (err) {
      console.error('Erro ao salvar pasta:', err)
      toast.error('Não foi possível salvar a pasta. Verifique as regras do Firestore (coleção "pastas").')
    } finally {
      setSalvando(false)
    }
  }

  const excluirPasta = async (p: Pasta) => {
    if (!confirm(`Excluir a pasta "${p.nome}"? Os cadernos dentro dela não serão apagados, só voltam para fora de pastas.`)) return
    const dentro = cadernos.filter(c => c.pastaId === p.id)
    await Promise.all(dentro.map(c => moverCadernoParaPasta(c.id, null)))
    await deletePasta(p.id)
    toast.success('Pasta excluída')
  }

  const alternarPasta = (id: string) => {
    setPastasFechadas(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const cadernosPorPasta = useMemo(() => {
    const mapa = new Map<string, Caderno[]>()
    for (const p of pastas) mapa.set(p.id, [])
    const semPasta: Caderno[] = []
    for (const c of cadernos) {
      if (c.pastaId && mapa.has(c.pastaId)) mapa.get(c.pastaId)!.push(c)
      else semPasta.push(c)
    }
    return { mapa, semPasta }
  }, [cadernos, pastas])

  // ── Render de um item de caderno (reutilizado dentro e fora de pastas) ──────
  const renderCaderno = (c: Caderno) => {
    if (renomeandoId === c.id) {
      return (
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
      )
    }

    return (
      <div key={c.id} className="relative">
        <button
          onClick={() => { setCadernoAtivo(c); setPaginaAtiva(null) }}
          onDoubleClick={() => iniciarRenomeacao(c)}
          className={clsx(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all group',
            cadernoAtivo?.id === c.id ? 'bg-surface-100 text-surface-900 font-medium' : 'text-surface-600 hover:bg-surface-50'
          )}
        >
          <span className="text-base">{c.emoji}</span>
          <span className="flex-1 truncate text-left">{c.titulo}</span>
          <button
            onClick={e => { e.stopPropagation(); setMovendoId(movendoId === c.id ? null : c.id) }}
            title="Mover para pasta"
            className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-brand-500 transition-all"
          >
            <FolderInput className="w-3 h-3" />
          </button>
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

        {movendoId === c.id && (
          <div className="absolute z-10 left-2 right-2 top-full mt-1 bg-white border border-surface-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => { moverCadernoParaPasta(c.id, null); setMovendoId(null); toast.success('Movido para fora de pastas') }}
              className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-surface-50', !c.pastaId && 'text-brand-600 font-medium')}
            >
              Sem pasta
            </button>
            {pastas.map(p => (
              <button
                key={p.id}
                onClick={() => { moverCadernoParaPasta(c.id, p.id); setMovendoId(null); toast.success(`Movido para "${p.nome}"`) }}
                className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-surface-50 flex items-center gap-1.5', c.pastaId === p.id && 'text-brand-600 font-medium')}
              >
                <span>{p.emoji}</span>{p.nome}
              </button>
            ))}
            {pastas.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-surface-400">Nenhuma pasta criada ainda</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">

        <div
          className={clsx(
            'flex flex-shrink-0 overflow-hidden transition-all duration-200 ease-in-out',
            painelAberto ? 'w-[416px]' : 'w-0'
          )}
        >
          {/* Sidebar cadernos + pastas */}
          <aside className="w-56 border-r border-surface-200 bg-white flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Cadernos</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={abrirNovaPasta}
                  title="Nova pasta"
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => abrirNovoCaderno()}
                  title="Novo caderno"
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-2" onClick={() => setMovendoId(null)}>
              {cadernos.length === 0 && pastas.length === 0 && (
                <p className="text-xs text-surface-400 text-center py-6 px-2">
                  Crie seu primeiro caderno ou pasta
                </p>
              )}

              {/* Pastas */}
              {pastas.map(p => {
                const itens = cadernosPorPasta.mapa.get(p.id) ?? []
                const fechada = pastasFechadas.has(p.id)
                return (
                  <div key={p.id} className="mb-1">
                    <div className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm text-surface-700 hover:bg-surface-50 group">
                      <button onClick={() => alternarPasta(p.id)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                        {fechada ? <ChevronRight className="w-3 h-3 text-surface-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-surface-400 flex-shrink-0" />}
                        <span className="text-base">{p.emoji}</span>
                        <span className="truncate font-medium">{p.nome}</span>
                        <span className="text-[10px] text-surface-300 flex-shrink-0">{itens.length}</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); abrirNovoCaderno(p.id) }}
                        title="Novo caderno nesta pasta"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-brand-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditarPasta(p) }}
                        title="Editar pasta"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-brand-500"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); excluirPasta(p) }}
                        title="Excluir pasta"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {!fechada && (
                      <div className="pl-4 border-l border-surface-100 ml-3.5 mt-0.5 space-y-0.5">
                        {itens.length === 0 ? (
                          <p className="text-[11px] text-surface-300 py-1.5 px-2">Pasta vazia</p>
                        ) : (
                          itens.map(renderCaderno)
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Cadernos sem pasta */}
              {cadernosPorPasta.semPasta.length > 0 && (
                <div className={pastas.length > 0 ? 'mt-2 pt-2 border-t border-surface-100' : ''}>
                  {cadernosPorPasta.semPasta.map(renderCaderno)}
                </div>
              )}
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
                    <p className="text-xs text-surface-400 text-center py-6 px-2">Nenhuma página ainda</p>
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
                <span className={clsx('text-xs transition-opacity flex-shrink-0', autoSaveLabel ? 'text-emerald-500 opacity-100' : 'text-surface-300 opacity-0')}>
                  {autoSaveLabel || 'Salvo'}
                </span>
                <span className="text-xs text-surface-300 ml-3 flex-shrink-0 hidden sm:inline">
                  {formatDistanceToNow(paginaAtiva.atualizadoEm, { addSuffix: true, locale: ptBR })}
                </span>
              </div>

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
      <Modal open={modalCaderno} onClose={() => setModalCaderno(false)} title={novoCadernoForm.pastaId ? 'Novo caderno na pasta' : 'Novo caderno'} size="sm">
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
                  className={clsx('w-9 h-9 rounded-xl text-xl transition-all', novoCadernoForm.emoji === em ? 'bg-brand-50 ring-2 ring-brand-300' : 'hover:bg-surface-100')}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          {pastas.length > 0 && (
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Pasta</label>
              <select
                className="input"
                value={novoCadernoForm.pastaId ?? ''}
                onChange={e => setNovoCadernoForm(f => ({ ...f, pastaId: e.target.value || undefined }))}
              >
                <option value="">Sem pasta</option>
                {pastas.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalCaderno(false)} className="btn-ghost">Cancelar</button>
            <button onClick={criarCaderno} disabled={salvando || !novoCadernoForm.titulo.trim()} className="btn-primary">
              {salvando ? 'Criando...' : 'Criar caderno'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pasta (criar/editar) */}
      <Modal open={modalPasta} onClose={() => setModalPasta(false)} title={editandoPasta ? 'Editar pasta' : 'Nova pasta'} size="sm">
        <div className="space-y-4">
          <p className="text-xs text-surface-400">
            Use pastas para agrupar vários cadernos — por exemplo, todos os livros e matérias de um semestre.
          </p>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Nome *</label>
            <input
              className="input"
              placeholder="Ex: 3º Semestre, Faculdade, Cursos..."
              value={pastaForm.nome}
              onChange={e => setPastaForm(f => ({ ...f, nome: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') salvarPasta() }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-2 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS_PASTA.map(em => (
                <button
                  key={em}
                  onClick={() => setPastaForm(f => ({ ...f, emoji: em }))}
                  className={clsx('w-9 h-9 rounded-xl text-xl transition-all', pastaForm.emoji === em ? 'bg-brand-50 ring-2 ring-brand-300' : 'hover:bg-surface-100')}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalPasta(false)} className="btn-ghost">Cancelar</button>
            <button onClick={salvarPasta} disabled={salvando || !pastaForm.nome.trim()} className="btn-primary">
              {salvando ? 'Salvando...' : editandoPasta ? 'Salvar' : 'Criar pasta'}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  )
}
