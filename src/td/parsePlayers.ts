// Excel'den yapıştırılan ya da elle yazılan oyuncu listesini çözer.
// Her satır: "numara <ayraç> ad soyad <ayraç> kategoriler" (sıra fark etmez; numara rakamlardan oluşan alandır).
// Ayraç: sekme (Excel), noktalı virgül ya da virgül. Kategoriler aynı hücrede "Erkek, Genç" ya da "Kadın/Senyör" gibi de yazılabilir.
import type { Player } from '../cloud/api'
import { cleanPlayerCategories, isMpNo, type PlayerCategory } from '../tournament/pairs'

const lower = (s: string) => s.toLocaleLowerCase('tr').trim()

/** Tek bir kategori kelimesi; null = "kategori yok" anlamında (açık/boş), undefined = tanınmadı. */
export function parseCategory(s: string): PlayerCategory | null | undefined {
  const t = lower(s)
  if (!t || t === '-' || t === 'açık' || t === 'acik' || t === 'yok') return null
  if (['kadın', 'kadin', 'k', 'bayan', 'kız', 'kiz', 'women', 'w', 'f'].includes(t)) return 'Kadın'
  if (['erkek', 'e', 'bay', 'men', 'm'].includes(t)) return 'Erkek'
  if (['senyör', 'senyor', 'senior', 's', 'sen'].includes(t)) return 'Senyör'
  if (['genç', 'genc', 'junior', 'g', 'j', 'jun'].includes(t)) return 'Genç'
  return undefined
}

/** Bir hücre tamamen kategorilerden mi oluşuyor? Öyleyse onları döner, değilse null. */
function categoryCell(cell: string): PlayerCategory[] | null {
  const tokens = cell.split(/[\s,+/&]+/).filter(Boolean)
  if (tokens.length === 0) return null
  const out: PlayerCategory[] = []
  for (const tok of tokens) {
    const c = parseCategory(tok)
    if (c === undefined) return null
    if (c) out.push(c)
  }
  return out
}

export function parsePlayers(text: string): { players: Player[]; errors: string[] } {
  const players: Player[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    const parts = line.split(line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',').map(p => p.trim())
    const noIdx = parts.findIndex(isMpNo)
    if (noIdx < 0) {
      if (i === 0 && /numara|no|isim|ad/i.test(line)) return // başlık satırı
      errors.push(`${i + 1}. satır: master point numarası bulunamadı`)
      return
    }
    const categories: PlayerCategory[] = []
    const nameParts: string[] = []
    parts.forEach((p, j) => {
      if (j === noIdx || !p) return
      // tek harfli kısaltmalar (k, e, s, g) isim de olabilir; sadece isim bulunduktan sonra kategori say
      const cats = categoryCell(p)
      if (cats && (nameParts.length > 0 || p.length > 1)) categories.push(...cats)
      else nameParts.push(p)
    })
    const name = nameParts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!name) {
      errors.push(`${i + 1}. satır: isim yok`)
      return
    }
    const mpNo = parts[noIdx]
    if (seen.has(mpNo)) {
      errors.push(`${i + 1}. satır: ${mpNo} numarası listede iki kez var`)
      return
    }
    if (categories.includes('Kadın') && categories.includes('Erkek')) {
      errors.push(`${i + 1}. satır: hem Kadın hem Erkek yazılmış`)
      return
    }
    seen.add(mpNo)
    players.push({ mpNo, name, categories: cleanPlayerCategories(categories) })
  })
  return { players, errors }
}
