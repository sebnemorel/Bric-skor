// Turnuvayı tarayıcının localStorage'ına kaydeder.
// Bulut turnuvalarında da bir kopya burada tutulur: internet giderse uygulama çalışmaya devam eder.
import type { Pending } from '../cloud/sync'
import type { Results } from './results'

export interface CloudInfo {
  id: string // veritabanındaki turnuva kimliği
  code: string // 6 haneli katılım kodu
  adminSecret?: string // sadece turnuvayı kuran cihazda bulunur
}

export interface Tournament {
  name: string
  date: string // GG.AA.YYYY
  pairCount: number
  boardsPerRound: number
  createdAt: number
  results: Results
  cloud?: CloudInfo // yoksa turnuva sadece bu telefonda
  pending?: Pending // buluta henüz gönderilemeyen değişiklikler
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
