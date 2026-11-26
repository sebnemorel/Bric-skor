import { describe, expect, it } from 'vitest'
import { createMovement, howell, mitchell, type Movement } from './movement'

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
    expect(() => mitchell(4, 3)).toThrow() // Mitchell en az 5 çift
    expect(() => mitchell(10, 0)).toThrow()
    expect(() => mitchell(10.5, 3)).toThrow()
  })
})

describe('Howell (4 çift, 2 masa)', () => {
  const m = createMovement(4, 6)

  it('4 çift için Howell seçilir', () => {
    expect(m.type).toBe('howell')
    expect(m.tables).toBe(2)
    expect(m.rounds).toHaveLength(3)
    expect(m.totalBoards).toBe(18)
    expect(createMovement(5, 3).type).toBe('mitchell')
  })

  it('her turda 4 çiftin hepsi bir kez oynar', () => {
    for (const round of m.rounds) {
      const pairs = round.flatMap(a => [a.ns, a.ew])
      expect([...pairs].sort()).toEqual([1, 2, 3, 4])
    }
  })

  it('herkes herkesle tam bir kez karşılaşır', () => {
    const meetings = new Set<string>()
    for (const round of m.rounds)
      for (const a of round) meetings.add([a.ns, a.ew!].sort().join('-'))
    expect([...meetings].sort()).toEqual(['1-2', '1-3', '1-4', '2-3', '2-4', '3-4'])
  })

  it('iki masa aynı turda aynı boardları oynar; her board iki kez oynanır', () => {
    for (const round of m.rounds) expect(round[0].boards).toEqual(round[1].boards)
    const count = new Map<number, number>()
    for (const round of m.rounds) for (const a of round) for (const b of a.boards) count.set(b, (count.get(b) ?? 0) + 1)
    expect(count.size).toBe(18)
    expect([...count.values()].every(c => c === 2)).toBe(true)
  })

  it('her çift her boardu tam bir kez oynar', () => {
    for (let p = 1; p <= 4; p++) {
      const boards = m.rounds.flatMap(r => r.filter(a => a.ns === p || a.ew === p).flatMap(a => a.boards))
      expect(new Set(boards).size).toBe(18)
      expect(boards).toHaveLength(18)
    }
  })

  it('1 numaralı çift hep 1. masada', () => {
    for (const round of m.rounds) expect([round[0].ns, round[0].ew]).toContain(1)
  })

  it('geçersiz girdiler', () => {
    expect(() => createMovement(3, 3)).toThrow()
    expect(() => howell(6, 3)).toThrow()
  })
})

describe('Sabit masalar', () => {
  it('çiftler masada sabit, her masa bütün boardları oynar, tek tur', async () => {
    const { stationary } = await import('./movement')
    const m = stationary(4, 12)
    expect(m.type).toBe('stationary')
    expect(m.tables).toBe(2)
    expect(m.rounds).toHaveLength(1)
    expect(m.totalBoards).toBe(12)
    for (const a of m.rounds[0]) {
      expect(a.ns).toBe(a.table)
      expect(a.ew).toBe(a.table)
      expect(a.boards).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
    }
  })

  it('geçersiz: tek çift sayısı, çok board', async () => {
    const { stationary } = await import('./movement')
    expect(() => stationary(5, 12)).toThrow()
    expect(() => stationary(2, 12)).toThrow()
    expect(() => stationary(6, 37)).toThrow()
  })

  it('hareket seçenekleri çift sayısına göre', async () => {
    const { availableKinds } = await import('./movement')
    expect(availableKinds(4)).toEqual(['stationary', 'howell'])
    expect(availableKinds(5)).toEqual(['mitchell'])
    expect(availableKinds(8)).toEqual(['stationary', 'mitchell'])
  })

  it('eski turnuvalar (tür yok) eskisi gibi seçilir', () => {
    expect(createMovement(4, 6).type).toBe('howell')
    expect(createMovement(10, 3).type).toBe('mitchell')
    expect(createMovement(4, 12, 'stationary').type).toBe('stationary')
  })
})
