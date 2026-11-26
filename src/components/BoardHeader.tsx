import { boardInfo } from '../scoring/score'

const SEAT_LABEL = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' } as const

/** Board numarasına göre dağıtan. (Yeşil/kırmızı skor girişinde elle seçilir.) */
export function BoardMeta({ board }: { board: number }) {
  return <span>Dağıtan: {SEAT_LABEL[boardInfo(board).dealer]}</span>
}
