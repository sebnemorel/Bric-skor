// Matchpoint hesaplama ve sıralama.
//
// Her board, onu oynayan tüm masaların K-G skorları birbiriyle karşılaştırılarak puanlanır:
//   - geçtiğin her skor için 2 puan, eşit olduğun her skor için 1 puan.
//   - bir boardun "top"u (alınabilecek en yüksek puan) = 2 × (o boardu oynayan masa sayısı − 1)
//   - D-B'nin puanı = top − K-G'nin puanı
// Mitchell'de K-G ve D-B çiftleri ayrı ayrı sıralanır (iki kazanan olur).
// Yüzde = toplam puan / toplam top. Böylece daha az board oynayan çift (oturan çift) haksızlığa uğramaz.

import type { BoardResult, Results } from './results'

export interface ScoredResult extends BoardResult {
  nsMP: number
  ewMP: number
  top: number
}

export interface Standing {
  pair: number
  mp: number
  top: number
  percent: number // 0-100
  boards: number // puanlanan board sayısı
  place: string // "1", "2=", ...
}

export interface StandingsResult {
  ns: Standing[]
  ew: Standing[]
  boards: Map<number, ScoredResult[]> // board no → o boardun tüm sonuçları (K-G skoruna göre sıralı)
}

/** Tek bir boardun sonuçlarını matchpointler. */
export function scoreBoard(results: BoardResult[]): ScoredResult[] {
  const top = 2 * (results.length - 1)
  return results
    .map(r => {
      let mp = 0
      for (const other of results) {
        if (other === r) continue
        if (r.nsScore > other.nsScore) mp += 2
        else if (r.nsScore === other.nsScore) mp += 1
      }
      return { ...r, nsMP: mp, ewMP: top - mp, top }
    })
    .sort((a, b) => b.nsScore - a.nsScore || a.ns - b.ns)
}

/** Sıralamayı yüzdeye göre dizer, eşitlere aynı sırayı "2=" şeklinde verir. */
function rank(list: Omit<Standing, 'place'>[]): Standing[] {
  const sorted = [...list].sort((a, b) => b.percent - a.percent || a.pair - b.pair)
  return sorted.map(s => {
    const firstIndex = sorted.findIndex(o => o.percent === s.percent)
    const tied = sorted.filter(o => o.percent === s.percent).length > 1
    return { ...s, place: `${firstIndex + 1}${tied ? '=' : ''}` }
  })
}

export function computeStandings(results: Results, nsPairs: number[], ewPairs: number[]): StandingsResult {
  // 1) Sonuçları boardlara ayır
  const byBoard = new Map<number, BoardResult[]>()
  for (const r of Object.values(results)) {
    const list = byBoard.get(r.board) ?? []
    list.push(r)
    byBoard.set(r.board, list)
  }

  // 2) Her boardu puanla
  const boards = new Map<number, ScoredResult[]>()
  for (const [board, list] of [...byBoard].sort((a, b) => a[0] - b[0])) {
    boards.set(board, scoreBoard(list))
  }

  // 3) Çiftlerin toplamları (tek kez oynanmış boardların top'u 0'dır, yüzdeye etki etmez)
  const totals = (side: 'ns' | 'ew', pairs: number[]) =>
    pairs.map(pair => {
      let mp = 0
      let top = 0
      let count = 0
      for (const list of boards.values()) {
        for (const r of list) {
          if (r[side] !== pair || r.top === 0) continue
          mp += side === 'ns' ? r.nsMP : r.ewMP
          top += r.top
          count++
        }
      }
      return { pair, mp, top, boards: count, percent: top === 0 ? 0 : Math.round((mp / top) * 10000) / 100 }
    })

  return {
    ns: rank(totals('ns', nsPairs)),
    ew: rank(totals('ew', ewPairs)),
    boards,
  }
}

/** Sıralamanın bir alt kümesini (ör. bir kategori) kendi içinde yeniden sıralar. */
export function rankSubset(list: Standing[], include: (pair: number) => boolean): Standing[] {
  return rank(list.filter(s => include(s.pair)).map(({ place: _place, ...rest }) => rest))
}

/**
 * Howell gibi çiftlerin yön değiştirdiği hareketler için tek sıralama:
 * bir çiftin K-G oturduğu boardlardaki K-G puanı + D-B oturduğu boardlardaki D-B puanı.
 */
export function combinedStandings(results: Results, pairs: number[]): StandingsResult {
  const base = computeStandings(results, [], [])
  const list = pairs.map(pair => {
    let mp = 0
    let top = 0
    let count = 0
    for (const boardResults of base.boards.values()) {
      for (const r of boardResults) {
        if (r.top === 0) continue
        if (r.ns === pair) mp += r.nsMP
        else if (r.ew === pair) mp += r.ewMP
        else continue
        top += r.top
        count++
      }
    }
    return { pair, mp, top, boards: count, percent: top === 0 ? 0 : Math.round((mp / top) * 10000) / 100 }
  })
  return { ns: rank(list), ew: [], boards: base.boards }
}
