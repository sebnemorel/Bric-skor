import { describe, expect, it } from 'vitest'
import { mergeNames, pairFromRow, pairToRow } from '../cloud/sync'
import { cleanPair, pairCategory, pairKey, pairNames, type PairNames } from './pairs'
import { computeStandings, rankSubset } from './standings'
import { resultKey, type BoardResult, type Results } from './results'

describe('çift isimleri', () => {
  const names: PairNames = {
    [pairKey('NS', 1)]: { player1: 'Ayşe Yılmaz', player2: 'Mehmet Kaya', category: 'Karışık' },
    [pairKey('EW', 2)]: { player1: 'Ali Demir', player2: '' },
  }

  it('isimleri birleştirir, eksik olanı atlar', () => {
    expect(pairNames(names, 'NS', 1)).toBe('Ayşe Yılmaz – Mehmet Kaya')
    expect(pairNames(names, 'EW', 2)).toBe('Ali Demir')
    expect(pairNames(names, 'NS', 5)).toBe('')
    expect(pairNames(undefined, 'NS', 1)).toBe('')
  })

  it('kategori', () => {
    expect(pairCategory(names, 'NS', 1)).toBe('Karışık')
    expect(pairCategory(names, 'EW', 2)).toBeUndefined()
  })

  it('temizleme: boşluk, uzunluk, geçersiz kategori', () => {
    const c = cleanPair({ player1: '  Ayşe   Yılmaz ', player2: 'x'.repeat(80), category: 'Pro' as never })
    expect(c.player1).toBe('Ayşe Yılmaz')
    expect(c.player2).toHaveLength(60)
    expect(c.category).toBeUndefined()
  })

  it('veritabanı satırı gidiş-dönüş', () => {
    const row = pairToRow('t1', 'EW-7', { player1: 'Ali', player2: 'Veli', category: 'Senyör' })
    expect(row).toMatchObject({ side: 'EW', number: 7, category: 'Senyör' })
    expect(pairFromRow(row)).toEqual({ key: 'EW-7', info: { player1: 'Ali', player2: 'Veli', category: 'Senyör' } })
  })

  it('gönderilmemiş yerel isim sunucudakinden önceliklidir', () => {
    const merged = mergeNames(
      { 'NS-1': { player1: 'Eski', player2: 'İsim' } },
      { 'NS-1': { player1: 'Yeni', player2: 'İsim' } },
    )
    expect(merged['NS-1'].player1).toBe('Yeni')
  })
})

describe('kategoriye göre sıralama', () => {
  const r = (ns: number, nsScore: number): BoardResult => ({
    board: 1, round: 1, table: ns, ns, ew: ns, passed: false, nsScore, enteredAt: 0,
  })
  const results: Results = {}
  ;[[1, 420], [2, 170], [3, 650], [4, 50]].forEach(([ns, s]) => (results[resultKey(1, ns)] = r(ns, s)))
  const st = computeStandings(results, [1, 2, 3, 4], [1, 2, 3, 4])

  it('alt küme kendi içinde 1. den başlar', () => {
    // genel: 3 > 1 > 2 > 4 ; sadece 1 ve 4 Kadın kategorisinde olsun
    const kadin = rankSubset(st.ns, p => p === 1 || p === 4)
    expect(kadin.map(s => [s.pair, s.place])).toEqual([[1, '1'], [4, '2']])
    // yüzdeler değişmez
    expect(kadin[0].percent).toBe(st.ns.find(s => s.pair === 1)!.percent)
  })
})
