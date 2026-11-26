// "Masam" modu: bir masanın telefonu için hangi turda olduğunu ve tur sonunda ne yapılacağını hesaplar.
// Mitchell'de K-G çifti masasında sabit oturur; bu yüzden "masa" = o masadaki telefon.

import type { Movement, TableAssignment } from './movement'
import { tableProgress, type Results } from './results'

/** Masanın bu turdaki yeri (1 tabanlı tur). */
export function seat(m: Movement, round: number, table: number): TableAssignment {
  return m.rounds[round - 1][table - 1]
}

/** Bu masada bu turun tüm skorları girildi mi? (Oturulan turlar "bitti" sayılır.) */
export function roundDone(m: Movement, results: Results, round: number, table: number): boolean {
  const a = seat(m, round, table)
  if (a.ew === null) return true
  const { done, total } = tableProgress(a, results)
  return done === total
}

/**
 * Masanın şu an oynaması gereken tur: skoru eksik ilk tur.
 * Hepsi bittiyse null.
 */
export function currentRound(m: Movement, results: Results, table: number): number | null {
  for (let r = 1; r <= m.rounds.length; r++) {
    const a = seat(m, r, table)
    if (a.ew !== null && !roundDone(m, results, r, table)) return r
  }
  return null
}

export interface Transition {
  boardsTo: number | null // bu turun boardları sonraki turda hangi masaya gidiyor
  ewTo: number | null // bu turun D-B çifti sonraki turda hangi masaya gidiyor
  next: TableAssignment // sonraki turda bu masa
  boardsFrom: number | null // sonraki turun boardları şu an hangi masada
}

/** Tur sonunda bu masada ne olacak? Son turdaysa null. */
export function transition(m: Movement, round: number, table: number): Transition | null {
  if (round >= m.rounds.length) return null
  const now = seat(m, round, table)
  const nextRound = m.rounds[round] // 0 tabanlı: sıradaki tur
  const next = nextRound[table - 1]
  const boardsTo = nextRound.find(a => a.boardSet === now.boardSet)?.table ?? null
  const ewTo = now.ew === null ? null : (nextRound.find(a => a.ew === now.ew)?.table ?? null)
  const boardsFrom = m.rounds[round - 1].find(a => a.boardSet === next.boardSet)?.table ?? null
  return { boardsTo, ewTo, next, boardsFrom }
}
