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
export interface Pasta {
  id: string
  userId: string
  nome: string
  emoji: string
  criadoEm: number
}

export interface Caderno {
  id: string
  userId: string
  pastaId?: string    // referência à Pasta — cadernos sem pasta ficam soltos
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
export interface Baralho {
  id: string
  userId: string
  nome: string
  emoji: string
  cor: string
  criadoEm: number
}

export interface Revisao {
  id: string
  userId: string
  baralhoId?: string      // referência ao Baralho — cartões "avulsos" não têm baralho
  titulo: string
  conteudo?: string       // frente do cartão (pergunta)
  verso?: string          // verso do cartão (resposta) — estilo Anki
  tags: string[]
  proximaRevisao: string  // ISO date
  intervalo: number       // days
  repeticoes: number
  facilidade: number      // ease factor (SM-2), começa em 2.5
  criadoEm: number
  atualizadoEm: number
}

// Notas de qualidade da revisão, no estilo Anki
export type QualidadeRevisao = 'errei' | 'dificil' | 'bom' | 'facil'
