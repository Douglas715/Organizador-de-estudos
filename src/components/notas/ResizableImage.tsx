'use client'

import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'
import { clsx } from 'clsx'

// Larguras predefinidas (em % do container), como no Word/Google Docs
const PRESETS = [
  { label: 'P', pct: 25 },
  { label: 'M', pct: 50 },
  { label: 'G', pct: 75 },
  { label: 'Original', pct: 100 },
]

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const width = node.attrs.width as string | null

  const iniciarArraste = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const startX = e.clientX
    const startWidth = wrapper.getBoundingClientRect().width
    const containerWidth = wrapper.parentElement?.getBoundingClientRect().width ?? startWidth

    setArrastando(true)

    const aoMover = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const novaLargura = Math.max(80, Math.min(containerWidth, startWidth + delta))
      const pct = Math.round((novaLargura / containerWidth) * 100)
      updateAttributes({ width: `${pct}%` })
    }
    const aoSoltar = () => {
      setArrastando(false)
      window.removeEventListener('mousemove', aoMover)
      window.removeEventListener('mouseup', aoSoltar)
    }
    window.addEventListener('mousemove', aoMover)
    window.addEventListener('mouseup', aoSoltar)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="my-3" style={{ width: width ?? '100%', maxWidth: '100%' }}>
      <div
        ref={wrapperRef}
        className={clsx(
          'relative inline-block group/img rounded-xl overflow-hidden',
          selected && 'ring-2 ring-brand-400'
        )}
        style={{ width: '100%' }}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          className="w-full h-auto block rounded-xl select-none"
          draggable={false}
        />

        {/* Barra de tamanhos predefinidos */}
        <div
          className={clsx(
            'absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg px-1 py-1 shadow-md transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'
          )}
        >
          {PRESETS.map(p => (
            <button
              key={p.pct}
              onMouseDown={e => e.preventDefault()}
              onClick={() => updateAttributes({ width: `${p.pct}%` })}
              title={`${p.label} (${p.pct}%)`}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-surface-500 hover:bg-surface-100 hover:text-brand-600"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Alça de arraste no canto inferior direito */}
        <div
          onMouseDown={iniciarArraste}
          className={clsx(
            'absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-sm bg-brand-500 border-2 border-white shadow cursor-nwse-resize transition-opacity',
            selected || arrastando ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'
          )}
        />
      </div>
    </NodeViewWrapper>
  )
}

// Extensão de imagem com atributo de largura + node view redimensionável
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.style.width || element.getAttribute('width') || '100%',
        renderHTML: attributes => ({
          style: `width: ${attributes.width || '100%'}`,
        }),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})

export default ResizableImage
