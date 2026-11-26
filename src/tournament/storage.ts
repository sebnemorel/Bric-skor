// Turnuvayı tarayıcının localStorage'ına kaydeder.
// Bulut turnuvalarında da bir kopya burada tutulur: internet giderse uygulama çalışmaya devam eder.
import type { Pending } from '../cloud/sync'
import type { MovementKind } from './movement'
import type { PairInfo, PairNames } from './pairs'
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
  boardsPerRound: number // sabit masalarda: toplam board
  movement?: MovementKind // yoksa (eski turnuvalar) çift sayısına göre seçilir
  createdAt: number
  results: Results
  cloud?: CloudInfo // yoksa turnuva sadece bu telefonda
  pending?: Pending // buluta henüz gönderilemeyen değişiklikler
  myTable?: number // "Masam" modu: bu telefon hangi masada (yoksa tüm masalar görünür)
  names?: PairNames // çift isimleri ve kategorileri ("NS-3" → { player1, player2, category })
  pendingNames?: Record<string, PairInfo> // buluta henüz gönderilemeyen isim değişiklikleri
  finished?: boolean // turnuva bitirildi: skorlar kilitli, sadece sonuçlar görünür
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
