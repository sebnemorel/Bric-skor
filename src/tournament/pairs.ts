// Çift isimleri ve kategoriler.

export type Side = 'NS' | 'EW'

export const CATEGORIES = ['Açık', 'Karışık', 'Kadın', 'Senyör', 'Genç'] as const
export type Category = (typeof CATEGORIES)[number]

export interface PairInfo {
  player1: string
  player2: string
  category?: Category
}

/** anahtar: "NS-3", "EW-5" */
export type PairNames = Record<string, PairInfo>

export const pairKey = (side: Side, number: number) => `${side}-${number}`

export const sideLabel = (side: Side) => (side === 'NS' ? 'K-G' : 'D-B')

/** "Ayşe Yılmaz – Mehmet Kaya"; isim girilmemişse boş metin. */
export function pairNames(names: PairNames | undefined, side: Side, number: number): string {
  const p = names?.[pairKey(side, number)]
  if (!p) return ''
  return [p.player1.trim(), p.player2.trim()].filter(Boolean).join(' – ')
}

export function pairCategory(names: PairNames | undefined, side: Side, number: number): Category | undefined {
  return names?.[pairKey(side, number)]?.category
}

/** Formdan gelen değeri temizler (boşlukları kırpar, uzunluğu sınırlar). */
export function cleanPair(p: PairInfo): PairInfo {
  const clip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 60)
  const out: PairInfo = { player1: clip(p.player1), player2: clip(p.player2) }
  if (p.category && (CATEGORIES as readonly string[]).includes(p.category)) out.category = p.category
  return out
}
