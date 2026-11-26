// Masa sonuçları: bir boardun bir masada nasıl oynandığı.
import { scoreForNSWithVul, type Contract, type Seat } from '../scoring/score'
import type { TableAssignment } from './movement'

/** Skor girişi formunun değeri (hem hesaplayıcıda hem turnuvada kullanılır). */
export interface ContractEntry {
  passed: boolean // dört pas
  contract: Contract
  declarer: Seat
  result: number // gerekenden fark: +1, 0, -2 ...
  /** Deklaran kırmızı mı (true) yeşil mi (false)? null = seçilmedi → yeşil sayılır. */
  vul: boolean | null
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
  /** Deklaran kırmızıda mıydı? (yoksa: seçilmedi, yeşil sayıldı) */
  vul?: boolean
  /** Rakip onayladı: artık sadece hakem/yönetici değiştirebilir. */
  confirmed?: boolean
}

export type Results = Record<string, BoardResult>

export const DEFAULT_ENTRY: ContractEntry = {
  passed: false,
  contract: { level: 4, strain: 'S', doubling: '' },
  declarer: 'S',
  result: 0,
  vul: null,
}

/** Bir board her K-G çifti tarafından en fazla bir kez oynanır; anahtar buna göre. */
export const resultKey = (board: number, ns: number) => `${board}-${ns}`

/** Formdaki girişin K-G skoru. Yeşil/kırmızı seçilmediyse yeşil (vulnerable değil) sayılır. */
export function entryScore(entry: ContractEntry): number {
  if (entry.passed) return 0
  const tricks = entry.contract.level + 6 + entry.result
  return scoreForNSWithVul(entry.declarer, entry.contract, tricks, entry.vul === true)
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

  const base: BoardResult = { board, round, table: a.table, ns: a.ns, ew: a.ew, enteredAt: now, passed: true, nsScore: 0, confirmed: true }
  if (entry.passed) return base
  const r: BoardResult = {
    ...base,
    passed: false,
    contract: entry.contract,
    declarer: entry.declarer,
    tricks: entry.contract.level + 6 + entry.result,
    nsScore: entryScore(entry),
  }
  if (entry.vul !== null) r.vul = entry.vul
  return r
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
    vul: r.vul ?? null,
  }
}

/** Masada kaç board girildi? */
export function tableProgress(a: TableAssignment, results: Results) {
  const done = a.boards.filter(b => results[resultKey(b, a.ns)]).length
  return { done, total: a.ew === null ? 0 : a.boards.length }
}

const STRAIN_SYMBOL = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' } as const

/** Bu board hangi masalarda oynandı? (tur, masa) — "diğer masalar" ve yönetici düzeltmesi için. */
export function boardSlots(m: { rounds: TableAssignment[][] }, board: number) {
  const slots: { round: number; a: TableAssignment }[] = []
  m.rounds.forEach((tables, i) => {
    for (const a of tables) if (a.ew !== null && a.boards.includes(board)) slots.push({ round: i + 1, a })
  })
  return slots
}

/** "4♠X Güney +1" gibi kısa yazım. */
export function formatResult(r: BoardResult): string {
  if (r.passed || !r.contract || !r.declarer || r.tricks === undefined) return 'Pas'
  const diff = r.tricks - (r.contract.level + 6)
  const res = diff === 0 ? '=' : diff > 0 ? `+${diff}` : `${diff}`
  return `${r.contract.level}${STRAIN_SYMBOL[r.contract.strain]}${r.contract.doubling} ${r.declarer} ${res}`
}
