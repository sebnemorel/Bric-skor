import { describe, expect, it } from 'vitest'
import { mitchell, type Movement } from './movement'

/** Bir hareketin briç kurallarına uyup uymadığını kontrol eder. */
function checkRules(m: Movement) {
  for (const round of m.rounds) {
    // Her turda her board seti en fazla bir masada
    const sets = round.map(a => a.boardSet)
    expect(new Set(sets).size).toBe(sets.length)
    // Her turda her D-B çifti en fazla bir masada
    const ews = round.map(a => a.ew).filter(e => e !== null)
    expect(new Set(ews).size).toBe(ews.length)
  }

  for (let ew = 1; ew <= m.tables; ew++) {
    if (ew === m.missingEW) continue
    const seats = m.rounds.map(r => r.find(a => a.ew === ew))
    // Her D-B çifti her tur oynar
    expect(seats.every(Boolean)).toBe(true)
    // Aynı K-G çiftiyle iki kez karşılaşmaz
    const opponents = seats.map(a => a!.ns)
    expect(new Set(opponents).size).toBe(opponents.length)
    // Aynı board setini iki kez oynamaz
    const played = seats.map(a => a!.boardSet)
    expect(new Set(played).size).toBe(played.length)
  }
}

describe('Mitchell hareketi', () => {
  it('tek masa sayısı: düz Mitchell', () => {
    const m = mitchell(14, 3) // 7 masa
    expect(m.type).toBe('mitchell')
    expect(m.tables).toBe(7)
    expect(m.rounds).toHaveLength(7)
    expect(m.totalBoards).toBe(21)
    checkRules(m)
  })

  it('çift masa sayısı: skip Mitchell, bir tur eksik', () => {
    const m = mitchell(16, 3) // 8 masa
    expect(m.type).toBe('skip-mitchell')
    expect(m.rounds).toHaveLength(7)
    checkRules(m)
  })

  it('ilk tur: herkes kendi numaralı masasında', () => {
    const m = mitchell(10, 4)
    expect(m.rounds[0][0]).toEqual({ table: 1, ns: 1, ew: 1, boardSet: 1, boards: [1, 2, 3, 4] })
    expect(m.rounds[0][2]).toEqual({ table: 3, ns: 3, ew: 3, boardSet: 3, boards: [9, 10, 11, 12] })
  })

  it('D-B yukarı, boardlar aşağı gider', () => {
    const m = mitchell(10, 2) // 5 masa
    // 2. turda D-B 1, Masa 2'de
    expect(m.rounds[1][1].ew).toBe(1)
    // 2. turda Masa 1'de, ilk tur Masa 2'de olan set var
    expect(m.rounds[1][0].boardSet).toBe(2)
    // son masadaki D-B çifti Masa 1'e döner
    expect(m.rounds[1][0].ew).toBe(5)
  })

  it('tek çift sayısında bir D-B çifti eksik (oturur)', () => {
    const m = mitchell(11, 3) // 6 masa, D-B 6 yok
    expect(m.missingEW).toBe(6)
    m.rounds.forEach(round => {
      expect(round.filter(a => a.ew === null)).toHaveLength(1)
    })
    checkRules(m)
  })

  it('her boyutta kurallara uyar', () => {
    for (let pairs = 5; pairs <= 40; pairs++) {
      for (const bpr of [2, 3, 4]) checkRules(mitchell(pairs, bpr))
    }
  })

  it('geçersiz girdiler', () => {
    expect(() => mitchell(4, 3)).toThrow()
    expect(() => mitchell(10, 0)).toThrow()
    expect(() => mitchell(10.5, 3)).toThrow()
  })
})
