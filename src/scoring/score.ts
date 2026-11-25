// Duplicate briç puan hesaplama motoru.
// Tüm puanlar DEKLARANIN tarafından bakılarak hesaplanır (yaparsa +, batarsa -).

export type Strain = 'C' | 'D' | 'H' | 'S' | 'NT' // ♣ ♦ ♥ ♠ Sanzatu
export type Doubling = '' | 'X' | 'XX' // yok, kontr, rekontr

export interface Contract {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
  strain: Strain
  doubling: Doubling
}

/**
 * Bir kontratın puanını hesaplar.
 * @param contract  Kontrat (seviye, renk, kontr durumu)
 * @param tricks    Deklaran tarafının aldığı toplam levée (0-13)
 * @param vulnerable Deklaran tarafı vulnerable mı?
 * @returns Deklaran tarafının puanı (batarsa negatif)
 */
export function scoreContract(contract: Contract, tricks: number, vulnerable: boolean): number {
  const { level, strain, doubling } = contract

  if (!Number.isInteger(tricks) || tricks < 0 || tricks > 13) {
    throw new Error(`Geçersiz levée sayısı: ${tricks}`)
  }

  const required = level + 6
  const multiplier = doubling === 'XX' ? 4 : doubling === 'X' ? 2 : 1

  // ---------- Kontrat batırıldı ----------
  if (tricks < required) {
    const down = required - tricks
    return -undertrickPenalty(down, doubling, vulnerable)
  }

  // ---------- Kontrat yapıldı ----------
  // 1) Kontrat levée puanı (sadece teklif edilen levéeler)
  const contractTrickPoints = trickValue(strain, level) * multiplier

  // 2) Oyun / kısmi oyun primi
  let bonus = contractTrickPoints >= 100 ? (vulnerable ? 500 : 300) : 50

  // 3) Şlem primleri
  if (level === 6) bonus += vulnerable ? 750 : 500
  if (level === 7) bonus += vulnerable ? 1500 : 1000

  // 4) Kontrlü/rekontrlü yapma primi ("insult")
  if (doubling === 'X') bonus += 50
  if (doubling === 'XX') bonus += 100

  // 5) Fazla levéeler
  const over = tricks - required
  let overPoints: number
  if (doubling === '') {
    overPoints = over * (strain === 'C' || strain === 'D' ? 20 : 30)
  } else {
    const perTrick = vulnerable ? 200 : 100
    overPoints = over * perTrick * (doubling === 'XX' ? 2 : 1)
  }

  return contractTrickPoints + bonus + overPoints
}

/** Kontr olmadan, teklif edilen levéelerin ham puanı. */
function trickValue(strain: Strain, level: number): number {
  if (strain === 'C' || strain === 'D') return level * 20
  if (strain === 'H' || strain === 'S') return level * 30
  return 40 + (level - 1) * 30 // NT: ilk levée 40, sonrakiler 30
}

/** Batma cezası (pozitif sayı döner). */
function undertrickPenalty(down: number, doubling: Doubling, vulnerable: boolean): number {
  if (doubling === '') return down * (vulnerable ? 100 : 50)

  let penalty = 0
  for (let i = 1; i <= down; i++) {
    if (vulnerable) {
      penalty += i === 1 ? 200 : 300
    } else {
      penalty += i === 1 ? 100 : i <= 3 ? 200 : 300
    }
  }
  return doubling === 'XX' ? penalty * 2 : penalty
}

// ---------------- Board bilgisi ----------------

export type Seat = 'N' | 'E' | 'S' | 'W'
export type Vulnerability = 'None' | 'NS' | 'EW' | 'All'

const VUL_CYCLE: Vulnerability[] = [
  'None', 'NS', 'EW', 'All',
  'NS', 'EW', 'All', 'None',
  'EW', 'All', 'None', 'NS',
  'All', 'None', 'NS', 'EW',
]

/** Board numarasına göre dağıtıcı ve vulnerability (standart 16'lık döngü). */
export function boardInfo(board: number): { dealer: Seat; vulnerability: Vulnerability } {
  if (!Number.isInteger(board) || board < 1) throw new Error(`Geçersiz board: ${board}`)
  const i = (board - 1) % 16
  const dealer = (['N', 'E', 'S', 'W'] as const)[i % 4]
  return { dealer, vulnerability: VUL_CYCLE[i] }
}

/** Verilen oyuncu tarafı bu boardda vulnerable mı? */
export function isVulnerable(board: number, declarer: Seat): boolean {
  const { vulnerability } = boardInfo(board)
  if (vulnerability === 'All') return true
  if (vulnerability === 'None') return false
  const side = declarer === 'N' || declarer === 'S' ? 'NS' : 'EW'
  return vulnerability === side
}

/** Skoru Kuzey-Güney tarafından ifade eder (skor fişlerinde standart). */
export function scoreForNS(board: number, declarer: Seat, contract: Contract, tricks: number): number {
  const s = scoreContract(contract, tricks, isVulnerable(board, declarer))
  return declarer === 'N' || declarer === 'S' ? s : -s
}
