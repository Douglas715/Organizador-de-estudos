import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, onSnapshot,
  Timestamp, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Compromisso, Caderno, Pagina, Tarefa, Revisao } from '@/types'
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

export async function revisarConteudo(revisao: Revisao) {
  // Spaced repetition: 1 → 3 → 7 → 14 → 30 → 60
  const intervalos = [1, 3, 7, 14, 30, 60]
  const proxIdx    = Math.min(revisao.repeticoes, intervalos.length - 1)
  const novoIntervalo   = intervalos[proxIdx]
  const proximaRevisao  = format(addDays(new Date(), novoIntervalo), 'yyyy-MM-dd')
  return updateDoc(doc(db, 'revisoes', revisao.id), {
    repeticoes:    revisao.repeticoes + 1,
    intervalo:     novoIntervalo,
    proximaRevisao,
    atualizadoEm:  now(),
  })
}

export async function deleteRevisao(id: string) {
  return deleteDoc(doc(db, 'revisoes', id))
}
