// Turnuvayı tarayıcının localStorage'ına kaydeder.
// Şimdilik tek cihaz için; çoklu cihaz aşamasında burası veritabanıyla değişecek.
import type { Results } from './results'

export interface Tournament {
  name: string
  date: string // GG.AA.YYYY
  pairCount: number
  boardsPerRound: number
  createdAt: number
  results: Results
}

const KEY = 'bric-skor:tournament'

export function loadTournament(): Tournament | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as Tournament
    return { ...t, results: t.results ?? {} } // eski sürümle kaydedilenlerde results yok
  } catch {
    return null
  }
}

export function saveTournament(t: Tournament | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    // depolama kapalıysa (gizli sekme vb.) sessizce geç
  }
}
