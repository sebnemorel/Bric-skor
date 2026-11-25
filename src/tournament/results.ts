// Masa sonuçları: bir boardun bir masada nasıl oynandığı.
import { scoreForNS, type Contract, type Seat } from '../scoring/score'
import type { TableAssignment } from './movement'

/** Skor girişi formunun değeri (hem hesaplayıcıda hem turnuvada kullanılır). */
export interface ContractEntry {
  passed: boolean // dört pas
  contract: Contract
  declarer: Seat
  result: number // gerekenden fark: +1, 0, -2 ...
}

export interface BoardResult {
  board: number
  round: number
  table: number
  ns: number
  ew: number
  passed: boolean
  contract?: Contract
  declarer?: Seat
  tricks?: number
  nsScore: number // K-G açısından skor (D-B için tersi)
  enteredAt: number
}

export type Results = Record<string, BoardResult>

export const DEFAULT_ENTRY: ContractEntry = {
  passed: false,
  contract: { level: 4, strain: 'S', doubling: '' },
  declarer: 'S',
  result: 0,
}

/** Bir board her K-G çifti tarafından en fazla bir kez oynanır; anahtar buna göre. */
export const resultKey = (board: number, ns: number) => `${board}-${ns}`

/** Formdaki girişin K-G skoru. */
export function entryScore(board: number, entry: ContractEntry): number {
  if (entry.passed) return 0
  const tricks = entry.contract.level + 6 + entry.result
  return scoreForNS(board, entry.declarer, entry.contract, tricks)
}

export function makeResult(
  a: TableAssignment,
  round: number,
  board: number,
  entry: ContractEntry,
  now = Date.now(),
): BoardResult {
  if (a.ew === null) throw new Error('Bu masada karşı çift yok')
  if (!a.boards.includes(board)) throw new Error(`Board ${board} bu masada oynanmıyor`)

  const base = { board, round, table: a.table, ns: a.ns, ew: a.ew, enteredAt: now }
  if (entry.passed) return { ...base, passed: true, nsScore: 0 }
  return {
    ...base,
    passed: false,
    contract: entry.contract,
    declarer: entry.declarer,
    tricks: entry.contract.level + 6 + entry.result,
    nsScore: entryScore(board, entry),
  }
}

/** Kayıtlı bir sonucu tekrar forma çevirir (düzeltme için). */
export function resultToEntry(r: BoardResult): ContractEntry {
  if (r.passed || !r.contract || !r.declarer || r.tricks === undefined) {
    return { ...DEFAULT_ENTRY, passed: true }
  }
  return {
    passed: false,
    contract: r.contract,
    declarer: r.declarer,
    result: r.tricks - (r.contract.level + 6),
  }
}

/** Masada kaç board girildi? */
export function tableProgress(a: TableAssignment, results: Results) {
  const done = a.boards.filter(b => results[resultKey(b, a.ns)]).length
  return { done, total: a.ew === null ? 0 : a.boards.length }
}

const STRAIN_SYMBOL = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' } as const

/** "4♠X Güney +1" gibi kısa yazım. */
export function formatResult(r: BoardResult): string {
  if (r.passed || !r.contract || !r.declarer || r.tricks === undefined) return 'Pas'
  const diff = r.tricks - (r.contract.level + 6)
  const res = diff === 0 ? '=' : diff > 0 ? `+${diff}` : `${diff}`
  return `${r.contract.level}${STRAIN_SYMBOL[r.contract.strain]}${r.contract.doubling} ${r.declarer} ${res}`
}
