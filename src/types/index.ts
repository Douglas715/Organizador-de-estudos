export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

// ── Agenda ──────────────────────────────────────────────────────────────────
export interface Compromisso {
  id: string
  userId: string
  titulo: string
  descricao?: string
  data: string        // ISO date "YYYY-MM-DD"
  hora?: string       // "HH:mm"
  cor: string         // hex color
  concluido: boolean
  criadoEm: number    // timestamp ms
}

// ── Notas ───────────────────────────────────────────────────────────────────
export interface Caderno {
  id: string
  userId: string
  titulo: string
  emoji: string
  cor: string
  criadoEm: number
  atualizadoEm: number
}

export interface Pagina {
  id: string
  userId: string
  cadernoId: string
  titulo: string
  conteudo: string    // TipTap JSON string
  criadoEm: number
  atualizadoEm: number
}

// ── Tarefas ──────────────────────────────────────────────────────────────────
export interface Tarefa {
  id: string
  userId: string
  titulo: string
  descricao?: string
  data: string        // ISO date "YYYY-MM-DD"
  prioridade: 'baixa' | 'media' | 'alta'
  concluida: boolean
  criadoEm: number
}

// ── Revisões ─────────────────────────────────────────────────────────────────
export interface Revisao {
  id: string
  userId: string
  titulo: string
  conteudo?: string
  tags: string[]
  proximaRevisao: string  // ISO date
  intervalo: number       // days
  repeticoes: number
  criadoEm: number
  atualizadoEm: number
}
