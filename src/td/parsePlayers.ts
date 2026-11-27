// Excel'den yapıştırılan ya da elle yazılan oyuncu listesini çözer.
// Her satır: "numara <ayraç> ad soyad <ayraç> kategori" (sıra fark etmez; numara rakamlardan oluşan alandır).
// Ayraç: sekme (Excel), noktalı virgül ya da virgül.
import { isMpNo, type PlayerCategory } from '../tournament/pairs'
import type { Player } from '../cloud/api'

const lower = (s: string) => s.toLocaleLowerCase('tr').trim()

export function parseCategory(s: string): PlayerCategory | null | undefined {
  const t = lower(s)
  if (!t || t === '-' || t === 'açık' || t === 'acik' || t === 'erkek') return null
  if (['kadın', 'kadin', 'k', 'bayan', 'kız', 'women', 'w'].includes(t)) return 'Kadın'
  if (['senyör', 'senyor', 'senior', 's', 'sen'].includes(t)) return 'Senyör'
  if (['genç', 'genc', 'junior', 'g', 'j'].includes(t)) return 'Genç'
  return undefined // tanınmadı
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
      // başlık satırını sessizce atla
      if (i === 0 && /numara|no|isim|ad/i.test(line)) return
      errors.push(`${i + 1}. satır: master point numarası bulunamadı`)
      return
    }
    const rest = parts.filter((_, j) => j !== noIdx)
    let category: PlayerCategory | null = null
    const catIdx = rest.findIndex(p => p && parseCategory(p) !== undefined && parseCategory(p) !== null)
    if (catIdx >= 0) {
      category = parseCategory(rest[catIdx]) ?? null
      rest.splice(catIdx, 1)
    }
    const name = rest.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!name) {
      errors.push(`${i + 1}. satır: isim yok`)
      return
    }
    const mpNo = parts[noIdx]
    if (seen.has(mpNo)) {
      errors.push(`${i + 1}. satır: ${mpNo} numarası listede iki kez var`)
      return
    }
    seen.add(mpNo)
    players.push({ mpNo, name, category })
  })
  return { players, errors }
}
