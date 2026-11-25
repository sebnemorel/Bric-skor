// Turnuvayı tarayıcının localStorage'ına kaydeder.
// Şimdilik tek cihaz için; çoklu cihaz aşamasında burası veritabanıyla değişecek.

export interface Tournament {
  name: string
  date: string // GG.AA.YYYY
  pairCount: number
  boardsPerRound: number
  createdAt: number
}

const KEY = 'bric-skor:tournament'

export function loadTournament(): Tournament | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Tournament) : null
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
