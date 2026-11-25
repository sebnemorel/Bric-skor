import { boardInfo } from '../scoring/score'

const VUL_LABEL = { None: 'Kimse', NS: 'K-G', EW: 'D-B', All: 'Herkes' } as const
const SEAT_LABEL = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' } as const

/** Board numarası, dağıtan ve vulnerability. */
export function BoardMeta({ board }: { board: number }) {
  const info = boardInfo(board)
  return (
    <span>
      Dağıtan: {SEAT_LABEL[info.dealer]} · Vul: {VUL_LABEL[info.vulnerability]}
    </span>
  )
}
