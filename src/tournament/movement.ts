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

export interface TableAssignment {
  table: number // masa no (1..)
  ns: number // K-G çift no (1..)
  ew: number | null // D-B çift no (1..); null = karşısında çift yok (oturur/bye)
  boardSet: number // board seti no (1..)
  boards: number[] // bu masada oynanacak board numaraları
}

export interface Movement {
  type: 'mitchell' | 'skip-mitchell'
  pairCount: number
  tables: number
  boardsPerRound: number
  totalBoards: number // hazırlanması gereken board sayısı
  missingEW: number | null // tek çift sayısında eksik olan D-B çifti
  rounds: TableAssignment[][] // rounds[tur][masa]
}

export const MIN_PAIRS = 5
export const MAX_PAIRS = 60

const mod = (a: number, n: number) => ((a % n) + n) % n

export function mitchell(pairCount: number, boardsPerRound: number): Movement {
  if (!Number.isInteger(pairCount) || pairCount < MIN_PAIRS || pairCount > MAX_PAIRS) {
    throw new Error(`Çift sayısı ${MIN_PAIRS}-${MAX_PAIRS} arasında olmalı`)
  }
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1 || boardsPerRound > 8) {
    throw new Error('Tur başına board sayısı 1-8 arasında olmalı')
  }

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

/** Bir D-B çiftinin turdaki yeri (masa kartı için). */
export function findEW(m: Movement, round: number, ew: number): TableAssignment | undefined {
  return m.rounds[round - 1]?.find(a => a.ew === ew)
}
