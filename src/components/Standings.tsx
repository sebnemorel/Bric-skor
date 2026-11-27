import { useMemo, useState } from 'react'
import type { Movement } from '../tournament/movement'
import { CATEGORIES, pairCategories, pairNames, type Category } from '../tournament/pairs'
import { formatResult } from '../tournament/results'
import { combinedStandings, computeStandings, rankSubset } from '../tournament/standings'
import { isHowell, pairNumbers } from '../tournament/movement'
import type { Tournament } from '../tournament/storage'
import { BoardMeta } from './BoardHeader'
import { BackButton, Card } from './ui'

type Side = 'ns' | 'ew'

export default function Standings({ tournament, m, back, backLabel = 'Turlar', banner }: {
  tournament: Tournament
  m: Movement
  back: () => void
  backLabel?: string
  banner?: React.ReactNode
}) {
  const [side, setSide] = useState<Side>('ns')
  const [board, setBoard] = useState<number | null>(null)
  const [category, setCategory] = useState<Category | null>(null)

  const howell = isHowell(m)
  const st = useMemo(() => {
    const { ns, ew } = pairNumbers(m)
    return howell ? combinedStandings(tournament.results, ns) : computeStandings(tournament.results, ns, ew)
  }, [tournament.results, m, howell])

  const pairSide = howell || side === 'ns' ? 'NS' : 'EW'
  const names = tournament.names
  const all = howell || side === 'ns' ? st.ns : st.ew
  // bu tarafta kullanılan kategoriler (filtre butonları için)
  const usedCategories = CATEGORIES.filter(c => all.some(s => pairCategories(names, pairSide, s.pair).includes(c)))
  const activeCategory = category && usedCategories.includes(category) ? category : null
  const list = activeCategory ? rankSubset(all, p => pairCategories(names, pairSide, p).includes(activeCategory)) : all
  const prefix = howell ? 'Çift' : side === 'ns' ? 'K-G' : 'D-B'
  const playedBoards = [...st.boards.keys()]
  const selected = board !== null ? st.boards.get(board) : undefined
  const anyScored = list.some(s => s.top > 0)

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>{backLabel}</BackButton>
      {banner}

      <Card>
        <div className="text-lg font-bold">{tournament.name}</div>
        <div className="text-sm text-slate-500">
          Sıralama · matchpoint yüzdesi{howell ? ' · Howell (tek sıralama)' : ''}
        </div>
      </Card>

      {!howell && (
      <nav className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm">
        {(['ns', 'ew'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`h-10 rounded-xl font-medium ${side === s ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            {s === 'ns' ? 'K-G' : 'D-B'}
          </button>
        ))}
      </nav>
      )}

      {usedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[null, ...usedCategories].map(c => (
            <button
              key={c ?? 'tumu'}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                activeCategory === c ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white'
              }`}
            >
              {c ?? 'Tümü'}
            </button>
          ))}
        </div>
      )}

      {!anyScored ? (
        <Card className="text-center text-sm text-slate-500">
          Sıralama için aynı boardun en az iki masada girilmiş olması gerekiyor.
        </Card>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Sıra</th>
                <th className="px-3 py-2">Oyuncular</th>
                <th className="px-3 py-2 text-right">MP</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.pair} className={`border-t border-slate-100 ${i === 0 ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-3 font-bold">{s.top > 0 ? s.place : '–'}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium leading-tight">{pairNames(names, pairSide, s.pair) || `${prefix} ${s.pair}`}</div>
                    <div className="text-xs text-slate-500">
                      {prefix} {s.pair}
                      {pairCategories(names, pairSide, s.pair).length > 0 && ` · ${pairCategories(names, pairSide, s.pair).join(', ')}`}
                      {` · ${s.boards} board`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm">{s.top > 0 ? `${s.mp}/${s.top}` : '–'}</td>
                  <td className="px-3 py-3 text-right text-lg font-bold">{s.top > 0 ? s.percent.toFixed(2) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Card className="space-y-3">
        <div className="text-sm font-medium text-slate-500">Board detayları</div>
        {playedBoards.length === 0 ? (
          <div className="text-sm text-slate-500">Henüz skor girilmedi.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {playedBoards.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBoard(board === b ? null : b)}
                className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold ${
                  board === b ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {selected && board !== null && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-bold">Board {board}</span>
              <span className="text-xs text-slate-500"><BoardMeta board={board} /></span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1">K-G</th>
                  <th className="py-1">D-B</th>
                  <th className="py-1">Kontrat</th>
                  <th className="py-1 text-right">Skor</th>
                  <th className="py-1 text-right">MP</th>
                </tr>
              </thead>
              <tbody>
                {selected.map(r => (
                  <tr key={r.ns} className="border-t border-slate-100">
                    <td className="py-2">{r.ns}</td>
                    <td className="py-2">{r.ew}</td>
                    <td className="py-2">{formatResult(r)}</td>
                    <td className="py-2 text-right font-medium">{r.nsScore > 0 ? `+${r.nsScore}` : r.nsScore}</td>
                    <td className="py-2 text-right text-slate-600">{r.nsMP}–{r.ewMP}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selected[0].top === 0 && (
              <p className="mt-2 text-xs text-slate-500">Bu board henüz tek masada girildi, puanlanmadı.</p>
            )}
          </div>
        )}
      </Card>

      <p className="px-1 text-xs text-slate-500">
        Her boardda geçtiğin her skor için 2, eşit olduğun her skor için 1 puan alırsın. Yüzde = toplam puan / alınabilecek
        en yüksek puan. {howell ? 'Howell’de tüm çiftler tek listede sıralanır.' : 'K-G ve D-B ayrı sıralanır.'}
      </p>
    </div>
  )
}
