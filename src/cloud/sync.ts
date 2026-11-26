// Bulut senkronizasyonunun saf (test edilebilir) kısmı:
// veritabanı satırı <-> uygulama sonucu dönüşümü ve bekleyen değişikliklerin birleştirilmesi.

import type { Contract, Seat } from '../scoring/score'
import { resultKey, type BoardResult, type Results } from '../tournament/results'

/** Veritabanındaki `results` tablosunun bir satırı. */
export interface ResultRow {
  tournament_id: string
  board: number
  ns: number
  ew: number
  round: number
  table_no: number
  passed: boolean
  contract: Contract | null
  declarer: Seat | null
  tricks: number | null
  ns_score: number
  entered_at: string
  device_id: string | null
}

/**
 * İnternet yokken ya da gönderilemeyen değişiklikler.
 * anahtar → sonuç (eklenecek/güncellenecek) ya da null (silinecek)
 */
export type Pending = Record<string, BoardResult | null>

export function toRow(tournamentId: string, r: BoardResult, deviceId: string): ResultRow {
  return {
    tournament_id: tournamentId,
    board: r.board,
    ns: r.ns,
    ew: r.ew,
    round: r.round,
    table_no: r.table,
    passed: r.passed,
    contract: r.contract ?? null,
    declarer: r.declarer ?? null,
    tricks: r.tricks ?? null,
    ns_score: r.nsScore,
    entered_at: new Date(r.enteredAt).toISOString(),
    device_id: deviceId,
  }
}

export function fromRow(row: ResultRow): BoardResult {
  const r: BoardResult = {
    board: row.board,
    round: row.round,
    table: row.table_no,
    ns: row.ns,
    ew: row.ew,
    passed: row.passed,
    nsScore: row.ns_score,
    enteredAt: Date.parse(row.entered_at),
  }
  if (!row.passed && row.contract && row.declarer && row.tricks !== null) {
    r.contract = row.contract
    r.declarer = row.declarer
    r.tricks = row.tricks
  }
  return r
}

/** Sunucudaki sonuçların üzerine henüz gönderilmemiş yerel değişiklikleri uygular. */
export function mergeResults(server: Results, pending: Pending): Results {
  const merged: Results = { ...server }
  for (const [key, value] of Object.entries(pending)) {
    if (value === null) delete merged[key]
    else merged[key] = value
  }
  return merged
}

/** Canlı gelen tek bir değişikliği uygular. Bekleyen yerel değişiklik varsa o önceliklidir. */
export function applyRemoteChange(
  results: Results,
  pending: Pending,
  change: { type: 'upsert'; row: ResultRow } | { type: 'delete'; board: number; ns: number },
): Results {
  const key = change.type === 'upsert' ? resultKey(change.row.board, change.row.ns) : resultKey(change.board, change.ns)
  if (key in pending) return results // yereldeki gönderilmemiş değişiklik kazanır
  const next = { ...results }
  if (change.type === 'upsert') next[key] = fromRow(change.row)
  else delete next[key]
  return next
}

/** Turnuva kodu: 6 karakter, karışabilecek harfler (0/O, 1/I) yok. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function isValidCode(code: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)
}
