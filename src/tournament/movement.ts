// Mitchell hareketi
//
// - K-G çiftleri masalarında sabit oturur (K-G 1 → Masa 1, K-G 2 → Masa 2 ...).
// - D-B çiftleri her tur bir üst masaya geçer (Masa 3 → Masa 4, son masa → Masa 1).
// - Boardlar her tur bir alt masaya geçer (Masa 3 → Masa 2, Masa 1 → son masa).
//
// Tek sayıda masada bu düzen kusursuzdur: herkes herkesle ve her board setiyle bir kez karşılaşır.
// Çift sayıda masada D-B çiftleri yarıdan sonra aynı boardlara denk gelir; bu yüzden
// turların yarısı bitince D-B çiftleri bir masa ATLAR ("skip Mitchell") ve bir tur eksik oynanır.
//
// İç hesaplarda 0 tabanlı sayılar kullanılır, dışarıya 1 tabanlı (Masa 1, Tur 1) verilir.
//
// 4 çift (2 masa) için Mitchell iyi çalışmaz; orada Howell kullanılır (aşağıda).

export interface TableAssignment {
  table: number // masa no (1..)
  ns: number // K-G çift no (1..)
  ew: number | null // D-B çift no (1..); null = karşısında çift yok (oturur/bye)
  boardSet: number // board seti no (1..)
  boards: number[] // bu masada oynanacak board numaraları
}

export interface Movement {
  type: 'mitchell' | 'skip-mitchell' | 'howell' | 'stationary'
  pairCount: number
  tables: number
  boardsPerRound: number
  totalBoards: number // hazırlanması gereken board sayısı
  missingEW: number | null // tek çift sayısında eksik olan D-B çifti
  rounds: TableAssignment[][] // rounds[tur][masa]
}

export const MIN_PAIRS = 4 // 4 çift = 2 masa Howell
export const MITCHELL_MIN_PAIRS = 5
export const MAX_PAIRS = 60
export const MAX_STATIONARY_BOARDS = 36

/** Kurulumda seçilen hareket türü. */
export type MovementKind = 'stationary' | 'howell' | 'mitchell'

const mod = (a: number, n: number) => ((a % n) + n) % n

export function mitchell(pairCount: number, boardsPerRound: number): Movement {
  if (!Number.isInteger(pairCount) || pairCount < MITCHELL_MIN_PAIRS || pairCount > MAX_PAIRS) {
    throw new Error(`Mitchell için çift sayısı ${MITCHELL_MIN_PAIRS}-${MAX_PAIRS} arasında olmalı`)
  }
  checkBoards(boardsPerRound)

  const n = Math.ceil(pairCount / 2) // masa sayısı
  const even = n % 2 === 0
  const roundCount = even ? n - 1 : n
  const missingEW = pairCount % 2 === 1 ? n : null

  const rounds: TableAssignment[][] = []
  for (let r = 0; r < roundCount; r++) {
    // Çift masada, yarıdan sonra D-B çiftleri fazladan bir masa ilerlemiş olur
    const skip = even && r >= n / 2 ? 1 : 0
    const round: TableAssignment[] = []

    for (let t = 0; t < n; t++) {
      // Bu turda t masasındaki D-B çifti, (t - r - skip) masasından başlamış olandır
      const ew = mod(t - r - skip, n) + 1
      // Boardlar aşağı iner: t masasındaki set, (t + r) masasından başlamış settir
      const set = mod(t + r, n)
      round.push({
        table: t + 1,
        ns: t + 1,
        ew: ew === missingEW ? null : ew,
        boardSet: set + 1,
        boards: Array.from({ length: boardsPerRound }, (_, i) => set * boardsPerRound + i + 1),
      })
    }
    rounds.push(round)
  }

  return {
    type: even ? 'skip-mitchell' : 'mitchell',
    pairCount,
    tables: n,
    boardsPerRound,
    totalBoards: n * boardsPerRound,
    missingEW,
    rounds,
  }
}

function checkBoards(boardsPerRound: number) {
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1 || boardsPerRound > 8) {
    throw new Error('Tur başına board sayısı 1-8 arasında olmalı')
  }
}

// ---------------- Howell (4 çift, 2 masa) ----------------
//
// - 3 tur oynanır, her çift diğer üç çiftle birer kez karşılaşır.
// - Çiftler numarayla anılır (1-4); hangi turda K-G, hangi turda D-B oturacakları tabloda yazar.
// - Her turda İKİ MASA AYNI BOARDLARI oynar: boardların yarısını oynayınca masalar boardları değiştirir.
// - 1 numaralı çift hep 1. masada oturur.
// - Sıralama tek listedir (K-G / D-B ayrımı yok).
//
//   Tur 1:  Masa 1: 1 – 2   Masa 2: 3 – 4
//   Tur 2:  Masa 1: 3 – 1   Masa 2: 2 – 4
//   Tur 3:  Masa 1: 4 – 1   Masa 2: 2 – 3      (soldaki K-G, sağdaki D-B)

const HOWELL_4: [number, number][][] = [
  [[1, 2], [3, 4]],
  [[3, 1], [2, 4]],
  [[4, 1], [2, 3]],
]

export function howell(pairCount: number, boardsPerRound: number): Movement {
  if (pairCount !== 4) throw new Error('Howell şu an sadece 4 çift (2 masa) için hazır')
  checkBoards(boardsPerRound)

  const rounds: TableAssignment[][] = HOWELL_4.map((tables, r) =>
    tables.map(([ns, ew], t) => ({
      table: t + 1,
      ns,
      ew,
      boardSet: r + 1, // iki masa da bu turun setini oynar
      boards: Array.from({ length: boardsPerRound }, (_, i) => r * boardsPerRound + i + 1),
    })),
  )

  return {
    type: 'howell',
    pairCount,
    tables: 2,
    boardsPerRound,
    totalBoards: HOWELL_4.length * boardsPerRound,
    missingEW: null,
    rounds,
  }
}

// ---------------- Sabit masalar ----------------
//
// - Çiftler bütün akşam aynı masada oturur: Masa 1'de K-G 1 – D-B 1, Masa 2'de K-G 2 – D-B 2 ...
// - Her masa aynı boardları oynar (1'den N'e); boardlar masalar arasında dolaştırılır.
// - Tek tur vardır. Skorlar masalar arasında karşılaştırılır; K-G ve D-B ayrı sıralanır.

export function stationary(pairCount: number, totalBoards: number): Movement {
  if (!Number.isInteger(pairCount) || pairCount < 4 || pairCount > MAX_PAIRS || pairCount % 2 !== 0) {
    throw new Error('Sabit masalar için çift sayısı 4 veya daha fazla ve çift sayı olmalı')
  }
  if (!Number.isInteger(totalBoards) || totalBoards < 1 || totalBoards > MAX_STATIONARY_BOARDS) {
    throw new Error(`Toplam board 1-${MAX_STATIONARY_BOARDS} arasında olmalı`)
  }
  const tables = pairCount / 2
  const boards = Array.from({ length: totalBoards }, (_, i) => i + 1)
  return {
    type: 'stationary',
    pairCount,
    tables,
    boardsPerRound: totalBoards,
    totalBoards,
    missingEW: null,
    rounds: [Array.from({ length: tables }, (_, t) => ({ table: t + 1, ns: t + 1, ew: t + 1, boardSet: 1, boards }))],
  }
}

/** Bu çift sayısıyla hangi hareketler mümkün? */
export function availableKinds(pairCount: number): MovementKind[] {
  const kinds: MovementKind[] = []
  if (pairCount >= 4 && pairCount % 2 === 0) kinds.push('stationary')
  if (pairCount === 4) kinds.push('howell')
  if (pairCount >= MITCHELL_MIN_PAIRS) kinds.push('mitchell')
  return kinds
}

/**
 * Hareketi oluşturur. `kind` verilmezse (eski turnuvalar) çift sayısına göre seçilir:
 * 4 çift → Howell, 5+ → Mitchell.
 */
export function createMovement(pairCount: number, boardsPerRound: number, kind?: MovementKind | null): Movement {
  const k = kind ?? (pairCount === 4 ? 'howell' : 'mitchell')
  if (k === 'stationary') return stationary(pairCount, boardsPerRound)
  if (k === 'howell') return howell(pairCount, boardsPerRound)
  return mitchell(pairCount, boardsPerRound)
}

export const isHowell = (m: Movement) => m.type === 'howell'

/** Hareketteki tüm çift numaraları (Howell'de tek liste, Mitchell'de K-G ve D-B ayrı). */
export function pairNumbers(m: Movement): { ns: number[]; ew: number[] } {
  if (isHowell(m)) {
    const all = Array.from({ length: m.pairCount }, (_, i) => i + 1)
    return { ns: all, ew: [] }
  }
  const ns = Array.from({ length: m.tables }, (_, i) => i + 1)
  return { ns, ew: ns.filter(p => p !== m.missingEW) }
}

/** Bir D-B çiftinin turdaki yeri (masa kartı için). */
export function findEW(m: Movement, round: number, ew: number): TableAssignment | undefined {
  return m.rounds[round - 1]?.find(a => a.ew === ew)
}
