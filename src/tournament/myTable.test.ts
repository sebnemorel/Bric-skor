import { describe, expect, it } from 'vitest'
import { mitchell } from './movement'
import { currentRound, roundDone, transition } from './myTable'
import { DEFAULT_ENTRY, makeResult, resultKey, type Results } from './results'

function fill(results: Results, m: ReturnType<typeof mitchell>, round: number, table: number) {
  const a = m.rounds[round - 1][table - 1]
  for (const b of a.boards) results[resultKey(b, a.ns)] = makeResult(a, round, b, DEFAULT_ENTRY)
}

describe('Masam: şu anki tur', () => {
  const m = mitchell(10, 2) // 5 masa, 5 tur

  it('hiç skor yokken 1. tur', () => {
    expect(currentRound(m, {}, 3)).toBe(1)
  })

  it('tur bitince sıradaki tura geçer', () => {
    const r: Results = {}
    fill(r, m, 1, 3)
    expect(roundDone(m, r, 1, 3)).toBe(true)
    expect(currentRound(m, r, 3)).toBe(2)
  })

  it('yarım kalan tur bitmemiş sayılır', () => {
    const r: Results = {}
    const a = m.rounds[0][2]
    r[resultKey(a.boards[0], a.ns)] = makeResult(a, 1, a.boards[0], DEFAULT_ENTRY)
    expect(currentRound(m, r, 3)).toBe(1)
  })

  it('başka masaların skorları etkilemez', () => {
    const r: Results = {}
    fill(r, m, 1, 1)
    expect(currentRound(m, r, 3)).toBe(1)
  })

  it('hepsi bitince null', () => {
    const r: Results = {}
    for (let round = 1; round <= m.rounds.length; round++) fill(r, m, round, 3)
    expect(currentRound(m, r, 3)).toBeNull()
  })

  it('oturulan turlar atlanır', () => {
    const odd = mitchell(9, 2) // 5 masa, D-B 5 yok
    // Masa 5, 1. turda oturuyor
    expect(odd.rounds[0][4].ew).toBeNull()
    expect(currentRound(odd, {}, 5)).toBe(2)
  })
})

describe('Masam: tur geçişi', () => {
  it('düz Mitchell: boardlar bir alt, D-B bir üst masaya', () => {
    const m = mitchell(10, 2) // 5 masa
    const t = transition(m, 1, 3)!
    expect(t.boardsTo).toBe(2)
    expect(t.ewTo).toBe(4)
    expect(t.next.ew).toBe(2) // Masa 2'deki D-B gelir
    expect(t.boardsFrom).toBe(4) // yeni boardlar Masa 4'ten gelir
  })

  it('son masa ve ilk masa döngüsü', () => {
    const m = mitchell(10, 2)
    expect(transition(m, 1, 1)!.boardsTo).toBe(5)
    expect(transition(m, 1, 5)!.ewTo).toBe(1)
  })

  it('skip Mitchell: atlama turunda D-B iki masa ilerler', () => {
    const m = mitchell(12, 2) // 6 masa, 4. turdan itibaren atlama
    expect(transition(m, 3, 1)!.ewTo).toBe(3) // 3. turdan 4. tura geçerken atlama
    expect(transition(m, 2, 1)!.ewTo).toBe(2) // normal geçiş
  })

  it('son turda geçiş yok', () => {
    const m = mitchell(10, 2)
    expect(transition(m, m.rounds.length, 1)).toBeNull()
  })

  it('geçiş bilgisi hareket tablosuyla tutarlı (her boyut)', () => {
    for (let pairs = 5; pairs <= 30; pairs++) {
      const m = mitchell(pairs, 3)
      for (let r = 1; r < m.rounds.length; r++) {
        for (let t = 1; t <= m.tables; t++) {
          const tr = transition(m, r, t)!
          const now = m.rounds[r - 1][t - 1]
          expect(m.rounds[r][tr.boardsTo! - 1].boardSet).toBe(now.boardSet)
          if (now.ew !== null) expect(m.rounds[r][tr.ewTo! - 1].ew).toBe(now.ew)
          expect(m.rounds[r - 1][tr.boardsFrom! - 1].boardSet).toBe(tr.next.boardSet)
        }
      }
    }
  })
})

describe('Masam: Howell geçişi', () => {
  it('çiftlerin yeni masaları (yön değişse bile) bulunur', async () => {
    const { createMovement } = await import('./movement')
    const m = createMovement(4, 2)
    // Tur 1: Masa 2'de 3 – 4; Tur 2'de 3 Masa 1'de (K-G), 4 Masa 2'de (D-B)
    const t = transition(m, 1, 2)!
    expect(t.nsTo).toBe(1)
    expect(t.ewTo).toBe(2)
    expect(t.boardsTo).toBeNull() // her tur yeni boardlar
    expect(t.next.ns).toBe(2)
    expect(t.next.ew).toBe(4)
  })
})
