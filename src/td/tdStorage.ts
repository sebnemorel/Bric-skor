// Hakem bilgisayarında kurulan turnuva (bu bilgisayar o turnuvanın hakemidir).
import type { MovementKind } from '../tournament/movement'

export interface TdTournament {
  id: string
  code: string
  adminSecret: string
  name: string
  date: string
  pairCount: number
  boardsPerRound: number
  movement: MovementKind
  createdAt: number
  finished?: boolean
}

const KEY = 'bric-skor:td'

/** Masa QR'ının bağlantısı: okutan telefon bu turnuvaya ve bu masaya bağlanır. */
export function tableLink(code: string, table: number, origin = window.location.origin) {
  return `${origin}/?kod=${code}&masa=${table}`
}

export function loadTd(): TdTournament | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TdTournament) : null
  } catch {
    return null
  }
}

export function saveTd(t: TdTournament | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    // depolama kapalıysa önemli değil
  }
}
