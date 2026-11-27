// Çift isimleri ve kategoriler.

export type Side = 'NS' | 'EW'

export const CATEGORIES = ['Açık', 'Karışık', 'Kadın', 'Senyör', 'Genç'] as const
export type Category = (typeof CATEGORIES)[number]

export interface PairInfo {
  player1: string
  player2: string
  /** Çiftin girdiği kategoriler (birden fazla olabilir: ör. Kadın + Senyör) */
  categories?: Category[]
  /** Kayıtlı oyuncuların master point numaraları (hakem panelinden seçildiyse) */
  mp1?: string
  mp2?: string
}

/** Kayıtlı oyuncunun kategorileri: cinsiyet (Kadın/Erkek) + Senyör/Genç, birden fazla olabilir. */
export type PlayerCategory = 'Kadın' | 'Erkek' | 'Senyör' | 'Genç'
export const PLAYER_CATEGORIES: PlayerCategory[] = ['Kadın', 'Erkek', 'Senyör', 'Genç']

/** Tekrarları ve geçersizleri atar, sabit sıraya dizer; Kadın ve Erkek birlikte olamaz (sonuncusu kalır). */
export function cleanPlayerCategories(list: readonly string[], last?: PlayerCategory): PlayerCategory[] {
  let set = new Set(list.filter((c): c is PlayerCategory => (PLAYER_CATEGORIES as string[]).includes(c)))
  if (set.has('Kadın') && set.has('Erkek')) {
    const keep = last === 'Erkek' ? 'Erkek' : 'Kadın'
    set = new Set([...set].filter(c => c !== (keep === 'Kadın' ? 'Erkek' : 'Kadın')))
  }
  return PLAYER_CATEGORIES.filter(c => set.has(c))
}

/**
 * İki oyuncunun kategorilerinden çiftin kategorileri:
 * ikisi de Kadın → Kadın; biri Kadın biri Erkek → Karışık; ikisi de Senyör → Senyör; ikisi de Genç → Genç.
 * Hiçbiri tutmazsa boş (çift sadece genel sıralamada yer alır).
 */
export function pairCategoriesFromPlayers(a: readonly PlayerCategory[] = [], b: readonly PlayerCategory[] = []): Category[] {
  const both = (c: PlayerCategory) => a.includes(c) && b.includes(c)
  const out: Category[] = []
  if (both('Kadın')) out.push('Kadın')
  if ((a.includes('Kadın') && b.includes('Erkek')) || (a.includes('Erkek') && b.includes('Kadın'))) out.push('Karışık')
  if (both('Senyör')) out.push('Senyör')
  if (both('Genç')) out.push('Genç')
  return CATEGORIES.filter(c => out.includes(c))
}

/** Kategori listesini temizler: geçerli olanlar, tekrarsız, sabit sırada. */
export function cleanCategories(list: readonly string[] | undefined): Category[] {
  if (!list) return []
  return CATEGORIES.filter(c => list.includes(c))
}

export const isMpNo = (s: string) => /^[0-9]{1,10}$/.test(s.trim())

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

export function pairCategories(names: PairNames | undefined, side: Side, number: number): Category[] {
  return names?.[pairKey(side, number)]?.categories ?? []
}

/** Formdan gelen değeri temizler (boşlukları kırpar, uzunluğu sınırlar). */
export function cleanPair(p: PairInfo): PairInfo {
  const clip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 60)
  const out: PairInfo = { player1: clip(p.player1), player2: clip(p.player2) }
  const cats = cleanCategories(p.categories)
  if (cats.length) out.categories = cats
  if (p.mp1 && isMpNo(p.mp1)) out.mp1 = p.mp1.trim()
  if (p.mp2 && isMpNo(p.mp2)) out.mp2 = p.mp2.trim()
  return out
}

/**
 * İsimlerin hangi anahtar altında tutulacağı: Mitchell'de K-G ve D-B ayrı çiftlerdir,
 * Howell'de ise çift numarası yönden bağımsızdır (hep "NS-k" altında tutulur).
 */
export const nameSide = (howell: boolean, side: Side): Side => (howell ? 'NS' : side)

/** Ekranda çiftin adı: Mitchell'de "K-G 3", Howell'de "Çift 3". */
export const pairLabel = (howell: boolean, side: Side, n: number) => (howell ? `Çift ${n}` : `${sideLabel(side)} ${n}`)
