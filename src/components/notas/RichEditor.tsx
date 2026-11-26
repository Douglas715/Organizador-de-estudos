'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextStyle from '@tiptap/extension-text-style'
import ResizableImage from './ResizableImage'
import FontSize from './FontSize'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListChecks, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Quote, Code, Highlighter, Minus, ImageIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// Converte um arquivo de imagem em base64 (data URL) para salvar direto no conteúdo da página
function fileParaDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// O documento inteiro é salvo no Firestore, incluindo imagens em base64.
const TAMANHO_MAXIMO_PAGINA = 900 * 1024
function imagemCabeNaPagina(file: File, documento: unknown) {
  const bytesAtuais = new TextEncoder().encode(JSON.stringify(documento)).length
  const bytesDaImagem = Math.ceil(file.size / 3) * 4 + 1024
  if (bytesAtuais + bytesDaImagem > TAMANHO_MAXIMO_PAGINA) {
    toast.error('A página ficaria muito grande para salvar. Use uma imagem menor ou outra página.')
    return false
  }
  return true
}
const TAMANHOS_FONTE = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

interface EditorProps {
  content: string
  onChange: (json: string) => void
  placeholder?: string
}

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={clsx(
        'w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors',
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-surface-200 mx-0.5" />
}

export default function RichEditor({ content, onChange, placeholder }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      FontSize,
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Comece a escrever...' }),
    ],
    content: content ? JSON.parse(content) : '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      attributes: { class: 'ProseMirror' },
      // Cola imagens da área de transferência (Ctrl+V / Cmd+V)
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items ?? [])
        const imagem = items.find(item => item.type.startsWith('image/'))
        if (!imagem) return false

        const file = imagem.getAsFile()
        if (!file) return false

        if (!imagemCabeNaPagina(file, view.state.doc.toJSON())) {
          return true
        }

        event.preventDefault()
        fileParaDataUrl(file).then(url => {
          view.dispatch(view.state.tr.replaceSelectionWith(
            view.state.schema.nodes.image.create({ src: url })
          ))
        })
        return true
      },
      // Suporte a arrastar-e-soltar imagens
      handleDrop: (view, event) => {
        const file = Array.from(event.dataTransfer?.files ?? []).find(f => f.type.startsWith('image/'))
        if (!file) return false

        if (!imagemCabeNaPagina(file, view.state.doc.toJSON())) {
          return true
        }

        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        fileParaDataUrl(file).then(url => {
          const node = view.state.schema.nodes.image.create({ src: url })
          const tr = view.state.tr.insert(coords?.pos ?? view.state.doc.content.size, node)
          view.dispatch(tr)
        })
        return true
      },
    },
  })

  const inserirImagemPorArquivo = useCallback(async (file: File | undefined) => {
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem')
      return
    }
    if (!imagemCabeNaPagina(file, editor.getJSON())) {
      return
    }
    const url = await fileParaDataUrl(file)
    editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  // sync when content prop changes externally (page switch)
  useEffect(() => {
    if (!editor) return
    const current = JSON.stringify(editor.getJSON())
    if (!content || current !== content) {
      editor.commands.setContent(content ? JSON.parse(content) : '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!editor) return null

  const e = editor

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-surface-100 bg-surface-50/80">
        <select
          value={e.getAttributes('textStyle').fontSize || ''}
          onChange={ev => {
            const val = ev.target.value
            if (!val) e.chain().focus().unsetFontSize().run()
            else e.chain().focus().setFontSize(val).run()
          }}
          title="Tamanho da fonte"
          className="text-xs border border-surface-200 rounded-lg px-1.5 py-1 bg-white text-surface-600 outline-none hover:border-surface-300 cursor-pointer"
        >
          <option value="">Padrão</option>
          {TAMANHOS_FONTE.map(t => (
            <option key={t} value={`${t}px`}>{t}px</option>
          ))}
        </select>

        <Divider />

        <ToolbarBtn onClick={() => e.chain().focus().toggleBold().run()} active={e.isActive('bold')} title="Negrito">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleItalic().run()} active={e.isActive('italic')} title="Itálico">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleUnderline().run()} active={e.isActive('underline')} title="Sublinhado">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleStrike().run()} active={e.isActive('strike')} title="Tachado">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleHighlight().run()} active={e.isActive('highlight')} title="Destaque">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()} active={e.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()} active={e.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()} active={e.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => e.chain().focus().toggleBulletList().run()} active={e.isActive('bulletList')} title="Lista">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleOrderedList().run()} active={e.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleTaskList().run()} active={e.isActive('taskList')} title="Lista de tarefas">
          <ListChecks className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('left').run()} active={e.isActive({ textAlign: 'left' })} title="Esquerda">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('center').run()} active={e.isActive({ textAlign: 'center' })} title="Centro">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().setTextAlign('right').run()} active={e.isActive({ textAlign: 'right' })} title="Direita">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => e.chain().focus().toggleBlockquote().run()} active={e.isActive('blockquote')} title="Citação">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().toggleCode().run()} active={e.isActive('code')} title="Código">
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => e.chain().focus().setHorizontalRule().run()} active={false} title="Divisor">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => fileInputRef.current?.click()} active={false} title="Inserir imagem">
          <ImageIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={ev => {
            inserirImagemPorArquivo(ev.target.files?.[0])
            ev.target.value = ''
          }}
        />
      </div>

      {/* Editor area — também aceita colar (Ctrl+V) ou arrastar imagens direto */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
