import { describe, expect, it } from 'vitest'
import { mitchell } from './movement'
import {
  boardSlots,
  DEFAULT_ENTRY,
  entryScore,
  formatResult,
  makeResult,
  resultKey,
  resultToEntry,
  tableProgress,
  type ContractEntry,
  type Results,
} from './results'

const m = mitchell(10, 3) // 5 masa
const t1 = m.rounds[0][0] // Tur 1, Masa 1: K-G 1 - D-B 1, board 1-3

const entry = (over: Partial<ContractEntry> = {}): ContractEntry => ({ ...DEFAULT_ENTRY, ...over })

describe('sonuç kaydı', () => {
  it('yapılan kontrat K-G açısından kaydedilir', () => {
    const r = makeResult(t1, 1, 1, entry({ declarer: 'S', result: 0 }), 123)
    expect(r).toMatchObject({ board: 1, round: 1, table: 1, ns: 1, ew: 1, tricks: 10, nsScore: 420 })
  })

  it('D-B deklaranken skor negatif', () => {
    // board 2: K-G kırmızı, D-B yeşil → Doğu 4♠ yaparsa D-B +420, K-G -420
    expect(makeResult(t1, 1, 2, entry({ declarer: 'E' })).nsScore).toBe(-420)
  })

  it('pas = 0', () => {
    const r = makeResult(t1, 1, 3, entry({ passed: true }))
    expect(r.passed).toBe(true)
    expect(r.nsScore).toBe(0)
    expect(formatResult(r)).toBe('Pas')
  })

  it('board bu masada değilse hata', () => {
    expect(() => makeResult(t1, 1, 7, entry())).toThrow()
  })

  it('karşı çift yoksa hata', () => {
    const odd = mitchell(9, 2) // D-B 5 yok
    const bye = odd.rounds[0].find(a => a.ew === null)!
    expect(() => makeResult(bye, 1, bye.boards[0], entry())).toThrow()
  })

  it('forma geri çevirme', () => {
    const e = entry({ contract: { level: 3, strain: 'NT', doubling: 'X' }, declarer: 'W', result: -2 })
    expect(resultToEntry(makeResult(t1, 1, 1, e))).toEqual(e)
  })

  it('kısa yazım', () => {
    const e = entry({ contract: { level: 4, strain: 'S', doubling: 'X' }, declarer: 'S', result: 1 })
    expect(formatResult(makeResult(t1, 1, 1, e))).toBe('4♠X S +1')
  })

  it('masa ilerlemesi', () => {
    const results: Results = {}
    expect(tableProgress(t1, results)).toEqual({ done: 0, total: 3 })
    results[resultKey(1, 1)] = makeResult(t1, 1, 1, entry())
    results[resultKey(2, 1)] = makeResult(t1, 1, 2, entry())
    expect(tableProgress(t1, results)).toEqual({ done: 2, total: 3 })
  })

  it('yeşil/kırmızı board numarasından gelir', () => {
    expect(entryScore(1, entry())).toBe(420) // board 1: herkes yeşil
    expect(entryScore(2, entry())).toBe(620) // board 2: K-G kırmızı
    // board 3: D-B kırmızı; Doğu 4♠X 2 batı → K-G +500
    expect(entryScore(3, entry({ declarer: 'E', result: -2, contract: { level: 4, strain: 'S', doubling: 'X' } }))).toBe(500)
  })

  it('kayıt rakip onaylı tutulur', () => {
    const r = makeResult(t1, 1, 2, entry())
    expect(r).toMatchObject({ confirmed: true, nsScore: 620 })
    expect(r.vul).toBeUndefined()
  })

  it('boardSlots: board hangi masalarda oynanıyor', () => {
    const slots = boardSlots(m, 1)
    expect(slots.length).toBe(5) // Mitchell: her board her masada bir kez
    expect(new Set(slots.map(s => s.a.ns)).size).toBe(5)
  })
})
