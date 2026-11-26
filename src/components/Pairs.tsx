// Çift isimleri: düzenleme formu ve tüm çiftler listesi.

import { useState } from 'react'
import type { Movement } from '../tournament/movement'
import {
  CATEGORIES,
  pairCategory,
  pairKey,
  pairNames,
  sideLabel,
  type Category,
  type PairInfo,
  type PairNames,
  type Side,
} from '../tournament/pairs'
import { BackButton, Card } from './ui'

// ---------------- Düzenleme formu ----------------

export function PairEditor({ side, number, names, onSave, back, backLabel }: {
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
  const [category, setCategory] = useState<Category | undefined>(current?.category)

  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg'

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>{backLabel}</BackButton>

      <Card className="text-center">
        <div className="text-sm text-slate-500">Çift</div>
        <div className="text-3xl font-bold">{sideLabel(side)} {number}</div>
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
          <span className="text-sm font-medium text-slate-500">Kategori</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[undefined, ...CATEGORIES].map(c => (
              <button
                key={c ?? 'yok'}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  category === c ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {c ?? 'Belirtilmedi'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
        onClick={() => {
          onSave(key, { player1, player2, category })
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

function PairList({ side, pairs, names, openPair }: {
  side: Side
  pairs: number[]
  names: PairNames | undefined
  openPair: (side: Side, number: number) => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
        {side === 'NS' ? 'Kuzey-Güney' : 'Doğu-Batı'}
      </div>
      {pairs.map(n => {
        const label = pairNames(names, side, n)
        const cat = pairCategory(names, side, n)
        return (
          <button
            key={n}
            type="button"
            onClick={() => openPair(side, n)}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left active:bg-emerald-50"
          >
            <span className="w-14 shrink-0 text-sm font-bold text-slate-500">{sideLabel(side)} {n}</span>
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
  const ns = Array.from({ length: m.tables }, (_, i) => i + 1)
  const ew = ns.filter(n => n !== m.missingEW)
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
      <PairList side="NS" pairs={ns} names={names} openPair={openPair} />
      <PairList side="EW" pairs={ew} names={names} openPair={openPair} />
    </div>
  )
}
