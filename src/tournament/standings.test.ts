import { describe, expect, it } from 'vitest'
import { mitchell } from './movement'
import { DEFAULT_ENTRY, makeResult, resultKey, type BoardResult, type Results } from './results'
import { computeStandings, scoreBoard } from './standings'

const r = (ns: number, ew: number, nsScore: number, board = 1): BoardResult => ({
  board, round: 1, table: ns, ns, ew, passed: false, nsScore, enteredAt: 0,
})

describe('tek board matchpoint', () => {
  it('geçilen skor 2, eşit skor 1 puan', () => {
    const scored = scoreBoard([r(1, 1, 420), r(2, 2, 420), r(3, 3, 170)])
    const by = (ns: number) => scored.find(s => s.ns === ns)!
    expect(by(1)).toMatchObject({ nsMP: 3, ewMP: 1, top: 4 })
    expect(by(2)).toMatchObject({ nsMP: 3, ewMP: 1, top: 4 })
    expect(by(3)).toMatchObject({ nsMP: 0, ewMP: 4, top: 4 })
  })

  it('negatif skorlar da doğru karşılaştırılır', () => {
    const scored = scoreBoard([r(1, 1, -100), r(2, 2, -620), r(3, 3, 50), r(4, 4, -100)])
    const by = (ns: number) => scored.find(s => s.ns === ns)!.nsMP
    expect(by(3)).toBe(6) // en iyi
    expect(by(1)).toBe(3) // ikinciyle eşit
    expect(by(4)).toBe(3)
    expect(by(2)).toBe(0) // en kötü
  })

  it('her boardda K-G + D-B puanı = top', () => {
    const scored = scoreBoard([r(1, 1, 90), r(2, 2, 110), r(3, 3, -50), r(4, 4, 110), r(5, 5, 400)])
    scored.forEach(s => expect(s.nsMP + s.ewMP).toBe(s.top))
    expect(scored.reduce((sum, s) => sum + s.nsMP, 0)).toBe((scored.length * scored[0].top) / 2)
  })

  it('tek oynanan board puanlanmaz (top 0)', () => {
    expect(scoreBoard([r(1, 1, 420)])[0].top).toBe(0)
  })
})

describe('sıralama', () => {
  it('yüzde ve beraberlik sırası', () => {
    const results: Results = {}
    // Board 1: K-G 1 > K-G 2 = K-G 3
    for (const [ns, s] of [[1, 420], [2, 170], [3, 170]] as const) results[resultKey(1, ns)] = r(ns, ns, s, 1)
    const st = computeStandings(results, [1, 2, 3], [1, 2, 3])
    expect(st.ns.map(s => [s.pair, s.place, s.percent])).toEqual([
      [1, '1', 100],
      [2, '2=', 25],
      [3, '2=', 25],
    ])
    expect(st.ew[0]).toMatchObject({ pair: 2, place: '1=', percent: 75 })
  })

  it('tam bir turnuva simülasyonu: toplam yüzdeler tutarlı', () => {
    const m = mitchell(14, 2) // 7 masa, 7 tur
    const results: Results = {}
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647)
    m.rounds.forEach((round, ri) => {
      for (const a of round) {
        for (const b of a.boards) {
          const entry = { ...DEFAULT_ENTRY, declarer: rand() < 0.5 ? ('S' as const) : ('E' as const), result: Math.floor(rand() * 4) - 2 }
          results[resultKey(b, a.ns)] = makeResult(a, ri + 1, b, entry)
        }
      }
    })
    const pairs = Array.from({ length: m.tables }, (_, i) => i + 1)
    const st = computeStandings(results, pairs, pairs)

    // Her board 7 kez oynandı → top 12
    for (const list of st.boards.values()) expect(list).toHaveLength(7)
    // Her çift 7 tur × 2 board = 14 board oynadı
    st.ns.forEach(s => expect(s.boards).toBe(14))
    // Herkes aynı sayıda board oynadığı için K-G yüzdelerinin ortalaması 50
    const avg = st.ns.reduce((sum, s) => sum + s.percent, 0) / st.ns.length
    expect(avg).toBeCloseTo(50, 1)
    // Sıra numaraları yüzdeye göre azalmayan sırada
    for (let i = 1; i < st.ns.length; i++) expect(st.ns[i - 1].percent).toBeGreaterThanOrEqual(st.ns[i].percent)
  })

  it('hiç sonuç yokken herkes 0', () => {
    const st = computeStandings({}, [1, 2], [1, 2])
    expect(st.ns.every(s => s.percent === 0)).toBe(true)
    expect(st.boards.size).toBe(0)
  })
})

describe('Howell: tek sıralama', () => {
  it('çiftin K-G ve D-B puanları toplanır', async () => {
    const { combinedStandings } = await import('./standings')
    // Board 1: Masa 1'de 1(K-G) – 2(D-B): +420 ; Masa 2'de 3(K-G) – 4(D-B): +170
    const results: Results = {
      [resultKey(1, 1)]: { ...r(1, 2, 420, 1) },
      [resultKey(1, 3)]: { ...r(3, 4, 170, 1) },
    }
    const st = combinedStandings(results, [1, 2, 3, 4])
    const by = (p: number) => st.ns.find(s => s.pair === p)!
    expect(by(1)).toMatchObject({ mp: 2, top: 2, percent: 100 }) // K-G olarak kazandı
    expect(by(2)).toMatchObject({ mp: 0, top: 2, percent: 0 })
    expect(by(4)).toMatchObject({ mp: 2, top: 2, percent: 100 }) // D-B olarak kazandı
    expect(st.ns[0].place).toBe('1=')
    expect(st.ew).toEqual([])
  })
})

describe('Sabit masalar: sıralama', () => {
  it('her board iki masada oynanır, K-G ve D-B ayrı sıralanır', async () => {
    const { stationary } = await import('./movement')
    const { makeResult, DEFAULT_ENTRY } = await import('./results')
    const m = stationary(4, 3)
    const res: Results = {}
    // Masa 1 her boardda 4♠ yapıyor (+420), Masa 2 batıyor (-50)
    for (const a of m.rounds[0])
      for (const b of a.boards)
        res[resultKey(b, a.ns)] = makeResult(a, 1, b, { ...DEFAULT_ENTRY, result: a.table === 1 ? 0 : -1 })
    const st = computeStandings(res, [1, 2], [1, 2])
    expect(st.ns[0]).toMatchObject({ pair: 1, percent: 100, boards: 3 })
    expect(st.ew[0]).toMatchObject({ pair: 2, percent: 100 })
  })
})
