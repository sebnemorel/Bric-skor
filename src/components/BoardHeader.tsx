import { boardInfo, isVulnerable } from '../scoring/score'

const SEAT_LABEL = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' } as const

function Side({ label, red }: { label: string; red: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ${red ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
      {label} {red ? 'Kırmızı' : 'Yeşil'}
    </span>
  )
}

/** Board numarasına göre dağıtan ve yeşil/kırmızı (standart 16'lık döngü). */
export function BoardMeta({ board }: { board: number }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
      <span>Dağıtan: {SEAT_LABEL[boardInfo(board).dealer]}</span>
      <Side label="K-G" red={isVulnerable(board, 'N')} />
      <Side label="D-B" red={isVulnerable(board, 'E')} />
    </span>
  )
}
