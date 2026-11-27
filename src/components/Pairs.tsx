// Çift isimleri: düzenleme formu ve tüm çiftler listesi.

import { useState } from 'react'
import { isHowell, pairNumbers, type Movement } from '../tournament/movement'
import {
  CATEGORIES,
  pairCategories,
  pairKey,
  pairLabel,
  pairNames,
  type Category,
  type PairInfo,
  type PairNames,
  type Side,
} from '../tournament/pairs'
import { BackButton, Card } from './ui'

// ---------------- Düzenleme formu ----------------

export function PairEditor({ howell = false, side, number, names, onSave, back, backLabel }: {
  howell?: boolean
  side: Side
  number: number
  names: PairNames | undefined
  onSave: (key: string, info: PairInfo) => void
  back: () => void
  backLabel: string
}) {
  const key = pairKey(side, number)
  const current = names?.[key]
  const [player1, setPlayer1] = useState(current?.player1 ?? '')
  const [player2, setPlayer2] = useState(current?.player2 ?? '')
  const [categories, setCategories] = useState<Category[]>(current?.categories ?? [])
  const toggle = (c: Category) =>
    setCategories(prev => CATEGORIES.filter(x => (x === c ? !prev.includes(c) : prev.includes(x))))

  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg'

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>{backLabel}</BackButton>

      <Card className="text-center">
        <div className="text-sm text-slate-500">Çift</div>
        <div className="text-3xl font-bold">{pairLabel(howell, side, number)}</div>
      </Card>

      <Card className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-500">1. oyuncu</span>
          <input className={input} value={player1} onChange={e => setPlayer1(e.target.value)} placeholder="Ad Soyad" autoComplete="off" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-500">2. oyuncu</span>
          <input className={input} value={player2} onChange={e => setPlayer2(e.target.value)} placeholder="Ad Soyad" autoComplete="off" />
        </label>

        <div>
          <span className="text-sm font-medium text-slate-500">Kategoriler (birden fazla seçilebilir)</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={categories.includes(c)}
                onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  categories.includes(c) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {categories.includes(c) && '✓ '}
                {c}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
        onClick={() => {
          // kayıtlı oyuncu numaraları korunur (hakem panelinden seçildiyse)
          onSave(key, { ...current, player1, player2, categories })
          back()
        }}
      >
        Kaydet
      </button>
      <p className="px-1 text-xs text-slate-500">
        Hakem isimleri girebilir; eksik ya da yanlışsa çiftler de kendi telefonlarından düzeltebilir. Son kaydedilen geçerli olur.
      </p>
    </div>
  )
}

// ---------------- Tüm çiftler ----------------

function PairList({ howell, side, pairs, names, openPair }: {
  howell: boolean
  side: Side
  pairs: number[]
  names: PairNames | undefined
  openPair: (side: Side, number: number) => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
        {howell ? 'Çiftler' : side === 'NS' ? 'Kuzey-Güney' : 'Doğu-Batı'}
      </div>
      {pairs.map(n => {
        const label = pairNames(names, side, n)
        const cat = pairCategories(names, side, n).join(', ')
        return (
          <button
            key={n}
            type="button"
            onClick={() => openPair(side, n)}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left active:bg-emerald-50"
          >
            <span className="w-14 shrink-0 text-sm font-bold text-slate-500">{pairLabel(howell, side, n)}</span>
            <span className={`flex-1 ${label ? 'font-medium' : 'text-sm text-slate-400'}`}>{label || 'İsim girilmedi'}</span>
            {cat && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{cat}</span>}
            <span className="text-slate-400">›</span>
          </button>
        )
      })}
    </section>
  )
}


export function PairsView({ m, names, openPair, back }: {
  m: Movement
  names: PairNames | undefined
  openPair: (side: Side, number: number) => void
  back: () => void
}) {
  const howell = isHowell(m)
  const { ns, ew } = pairNumbers(m)
  const filled = [...ns.map(n => pairNames(names, 'NS', n)), ...ew.map(n => pairNames(names, 'EW', n))].filter(Boolean).length

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>Turlar</BackButton>
      <Card>
        <div className="text-lg font-bold">Çiftler ve isimler</div>
        <div className="text-sm text-slate-500">
          {filled} / {ns.length + ew.length} çiftin ismi girildi. Düzenlemek için çifte dokun.
        </div>
      </Card>
      <PairList howell={howell} side="NS" pairs={ns} names={names} openPair={openPair} />
      {ew.length > 0 && <PairList howell={howell} side="EW" pairs={ew} names={names} openPair={openPair} />}
    </div>
  )
}
