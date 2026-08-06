import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, onSnapshot,
  Timestamp, serverTimestamp, deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Compromisso, Caderno, Pagina, Tarefa, Revisao, QualidadeRevisao, Baralho, Pasta } from '@/types'
import { addDays, format } from 'date-fns'

// ── helpers ──────────────────────────────────────────────────────────────────
const now = () => Date.now()

// ── AGENDA ───────────────────────────────────────────────────────────────────
export function subscribeCompromissos(userId: string, data: string, cb: (c: Compromisso[]) => void) {
  const q = query(
    collection(db, 'compromissos'),
    where('userId', '==', userId),
    where('data', '==', data),
    orderBy('hora')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Compromisso)))
  )
}

export async function addCompromisso(data: Omit<Compromisso, 'id'>) {
  return addDoc(collection(db, 'compromissos'), data)
}

export async function updateCompromisso(id: string, data: Partial<Compromisso>) {
  return updateDoc(doc(db, 'compromissos', id), data)
}

export async function deleteCompromisso(id: string) {
  return deleteDoc(doc(db, 'compromissos', id))
}

// ── PASTAS (agrupam cadernos) ────────────────────────────────────────────────
export function subscribePastas(userId: string, cb: (p: Pasta[]) => void) {
  const q = query(
    collection(db, 'pastas'),
    where('userId', '==', userId),
    orderBy('criadoEm')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pasta)))
  )
}

export async function addPasta(data: Omit<Pasta, 'id'>) {
  return addDoc(collection(db, 'pastas'), data)
}

export async function updatePasta(id: string, data: Partial<Pasta>) {
  return updateDoc(doc(db, 'pastas', id), data)
}

export async function deletePasta(id: string) {
  return deleteDoc(doc(db, 'pastas', id))
}

// Remove a referência à pasta de um caderno (usa deleteField pois o Firestore não aceita "undefined")
export async function removerPastaDoCaderno(id: string) {
  return updateDoc(doc(db, 'cadernos', id), { pastaId: deleteField() })
}

// ── CADERNOS ─────────────────────────────────────────────────────────────────
export function subscribeCadernos(userId: string, cb: (c: Caderno[]) => void) {
  const q = query(
    collection(db, 'cadernos'),
    where('userId', '==', userId),
    orderBy('criadoEm')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Caderno)))
  )
}

export async function addCaderno(data: Omit<Caderno, 'id'>) {
  return addDoc(collection(db, 'cadernos'), data)
}

export async function updateCaderno(id: string, data: Partial<Caderno>) {
  return updateDoc(doc(db, 'cadernos', id), data)
}

export async function deleteCaderno(id: string) {
  return deleteDoc(doc(db, 'cadernos', id))
}

// Move um caderno para dentro de uma pasta (ou tira dele, se pastaId for null)
export async function moverCadernoParaPasta(id: string, pastaId: string | null) {
  return updateDoc(doc(db, 'cadernos', id), pastaId ? { pastaId } : { pastaId: deleteField() })
}

// ── PÁGINAS ──────────────────────────────────────────────────────────────────
export function subscribePaginas(userId: string, cadernoId: string, cb: (p: Pagina[]) => void) {
  const q = query(
    collection(db, 'paginas'),
    where('userId', '==', userId),
    where('cadernoId', '==', cadernoId),
    orderBy('criadoEm')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pagina)))
  )
}

export async function addPagina(data: Omit<Pagina, 'id'>) {
  return addDoc(collection(db, 'paginas'), data)
}

export async function updatePagina(id: string, data: Partial<Pagina>) {
  return updateDoc(doc(db, 'paginas', id), data)
}

export async function deletePagina(id: string) {
  return deleteDoc(doc(db, 'paginas', id))
}

// ── TAREFAS ───────────────────────────────────────────────────────────────────
export function subscribeTarefas(userId: string, data: string, cb: (t: Tarefa[]) => void) {
  const q = query(
    collection(db, 'tarefas'),
    where('userId', '==', userId),
    where('data', '==', data),
    orderBy('criadoEm')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa)))
  )
}

export async function addTarefa(data: Omit<Tarefa, 'id'>) {
  return addDoc(collection(db, 'tarefas'), data)
}

export async function updateTarefa(id: string, data: Partial<Tarefa>) {
  return updateDoc(doc(db, 'tarefas', id), data)
}

export async function deleteTarefa(id: string) {
  return deleteDoc(doc(db, 'tarefas', id))
}

// ── BARALHOS (revisões) ─────────────────────────────────────────────────────
export function subscribeBaralhos(userId: string, cb: (b: Baralho[]) => void) {
  const q = query(
    collection(db, 'baralhos'),
    where('userId', '==', userId),
    orderBy('criadoEm')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Baralho)))
  )
}

export async function addBaralho(data: Omit<Baralho, 'id'>) {
  return addDoc(collection(db, 'baralhos'), data)
}

export async function updateBaralho(id: string, data: Partial<Baralho>) {
  return updateDoc(doc(db, 'baralhos', id), data)
}

export async function deleteBaralho(id: string) {
  return deleteDoc(doc(db, 'baralhos', id))
}

// ── REVISÕES ──────────────────────────────────────────────────────────────────
export function subscribeRevisoes(userId: string, cb: (r: Revisao[]) => void) {
  const q = query(
    collection(db, 'revisoes'),
    where('userId', '==', userId),
    orderBy('proximaRevisao')
  )
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Revisao)))
  )
}

export async function addRevisao(data: Omit<Revisao, 'id'>) {
  return addDoc(collection(db, 'revisoes'), data)
}

export async function updateRevisao(id: string, data: Partial<Revisao>) {
  return updateDoc(doc(db, 'revisoes', id), data)
}

// Remove a referência ao baralho (usa deleteField pois o Firestore não aceita "undefined")
export async function removerBaralhoDaRevisao(id: string) {
  return updateDoc(doc(db, 'revisoes', id), { baralhoId: deleteField() })
}

// Mapeia a nota do usuário (estilo Anki) para o "quality" 0-5 usado no SM-2 clássico
const QUALIDADE_PARA_SM2: Record<QualidadeRevisao, number> = {
  errei:   1,
  dificil: 3,
  bom:     4,
  facil:   5,
}

export async function revisarConteudo(revisao: Revisao, qualidade: QualidadeRevisao = 'bom') {
  // Algoritmo SM-2 (o mesmo princípio usado pelo Anki)
  const q = QUALIDADE_PARA_SM2[qualidade]
  let facilidade = revisao.facilidade ?? 2.5
  let repeticoes = revisao.repeticoes ?? 0
  let intervalo  = revisao.intervalo ?? 1

  if (q < 3) {
    // Errou ou achou muito difícil: reinicia o ciclo, mas mantém a facilidade
    // (levemente reduzida) para o cartão voltar a aparecer em breve
    repeticoes = 0
    intervalo  = 1
  } else {
    if (repeticoes === 0) intervalo = 1
    else if (repeticoes === 1) intervalo = 3
    else intervalo = Math.round(intervalo * facilidade)
    repeticoes += 1
  }

  // Atualiza o fator de facilidade (nunca abaixo de 1.3)
  facilidade = facilidade + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  facilidade = Math.max(1.3, Math.round(facilidade * 100) / 100)

  const proximaRevisao = format(addDays(new Date(), intervalo), 'yyyy-MM-dd')

  return updateDoc(doc(db, 'revisoes', revisao.id), {
    repeticoes,
    intervalo,
    facilidade,
    proximaRevisao,
    atualizadoEm: now(),
  })
}

export async function deleteRevisao(id: string) {
  return deleteDoc(doc(db, 'revisoes', id))
}
