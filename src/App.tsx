import { useState } from 'react'
import { boardInfo, scoreForNS, type Contract, type Doubling, type Seat, type Strain } from './scoring/score'

const STRAINS: { value: Strain; label: string; color: string }[] = [
  { value: 'C', label: '♣', color: 'text-slate-900' },
  { value: 'D', label: '♦', color: 'text-red-600' },
  { value: 'H', label: '♥', color: 'text-red-600' },
  { value: 'S', label: '♠', color: 'text-slate-900' },
  { value: 'NT', label: 'NT', color: 'text-slate-900' },
]
const SEATS: { value: Seat; label: string }[] = [
  { value: 'N', label: 'Kuzey' },
  { value: 'E', label: 'Doğu' },
  { value: 'S', label: 'Güney' },
  { value: 'W', label: 'Batı' },
]
const VUL_LABEL = { None: 'Kimse', NS: 'K-G', EW: 'D-B', All: 'Herkes' } as const
const SEAT_LABEL = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' } as const

function Chip({ active, onClick, children, className = '' }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl border text-lg font-semibold transition ${
        active ? 'border-emerald-700 bg-emerald-700 !text-white' : 'border-slate-300 bg-white hover:bg-slate-50'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [board, setBoard] = useState(1)
  const [level, setLevel] = useState<Contract['level']>(4)
  const [strain, setStrain] = useState<Strain>('S')
  const [doubling, setDoubling] = useState<Doubling>('')
  const [declarer, setDeclarer] = useState<Seat>('S')
  const [result, setResult] = useState(0) // yapılan - gereken (ör. +1, 0, -2)

  const info = boardInfo(board)
  const tricks = level + 6 + result
  const ns = scoreForNS(board, declarer, { level, strain, doubling }, tricks)

  const minResult = -(level + 6)
  const maxResult = 7 - level

  const changeLevel = (l: Contract['level']) => {
    setLevel(l)
    setResult(r => Math.min(Math.max(r, -(l + 6)), 7 - l))
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-emerald-50 p-4 text-slate-900">
      <h1 className="mb-4 text-center text-2xl font-bold">Briç Skor</h1>

      {/* Board */}
      <section className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <button className="h-10 w-10 rounded-full bg-slate-100 text-xl" onClick={() => setBoard(b => Math.max(1, b - 1))}>−</button>
        <div className="text-center">
          <div className="text-sm text-slate-500">Board</div>
          <div className="text-3xl font-bold">{board}</div>
          <div className="text-xs text-slate-500">
            Dağıtan: {SEAT_LABEL[info.dealer]} · Vul: {VUL_LABEL[info.vulnerability]}
          </div>
        </div>
        <button className="h-10 w-10 rounded-full bg-slate-100 text-xl" onClick={() => setBoard(b => b + 1)}>+</button>
      </section>

      {/* Kontrat */}
      <section className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Kontrat</div>
        <div className="grid grid-cols-7 gap-1.5">
          {([1, 2, 3, 4, 5, 6, 7] as const).map(l => (
            <Chip key={l} active={level === l} onClick={() => changeLevel(l)}>{l}</Chip>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {STRAINS.map(s => (
            <Chip key={s.value} active={strain === s.value} onClick={() => setStrain(s.value)} className={s.color}>
              {s.label}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Chip active={doubling === ''} onClick={() => setDoubling('')}>—</Chip>
          <Chip active={doubling === 'X'} onClick={() => setDoubling('X')}>X</Chip>
          <Chip active={doubling === 'XX'} onClick={() => setDoubling('XX')}>XX</Chip>
        </div>
      </section>

      {/* Deklaran */}
      <section className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Deklaran</div>
        <div className="grid grid-cols-4 gap-1.5">
          {SEATS.map(s => (
            <Chip key={s.value} active={declarer === s.value} onClick={() => setDeclarer(s.value)} className="text-base">
              {s.label}
            </Chip>
          ))}
        </div>
      </section>

      {/* Sonuç */}
      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium text-slate-500">Sonuç</div>
        <div className="flex items-center justify-between">
          <button
            className="h-12 w-12 rounded-full bg-slate-100 text-2xl disabled:opacity-30"
            disabled={result <= minResult}
            onClick={() => setResult(r => r - 1)}
          >−</button>
          <div className="text-center">
            <div className="text-3xl font-bold">
              {result === 0 ? '=' : result > 0 ? `+${result}` : result}
            </div>
            <div className="text-xs text-slate-500">{tricks} levée</div>
          </div>
          <button
            className="h-12 w-12 rounded-full bg-slate-100 text-2xl disabled:opacity-30"
            disabled={result >= maxResult}
            onClick={() => setResult(r => r + 1)}
          >+</button>
        </div>
      </section>

      {/* Skor */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-700 p-4 text-center text-white">
          <div className="text-sm opacity-80">K-G</div>
          <div className="text-3xl font-bold">{ns > 0 ? ns : ''}</div>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4 text-center text-white">
          <div className="text-sm opacity-80">D-B</div>
          <div className="text-3xl font-bold">{ns < 0 ? -ns : ''}</div>
        </div>
      </section>
    </main>
  )
}
