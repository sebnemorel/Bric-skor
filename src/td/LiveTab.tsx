// Hakem ekranı · canlı kontrol: tur süresi, masa ilerlemesi, sıralama, skor düzeltme, bitirme.
import { useState } from 'react'
import { adminWriteResult, finishTournament } from '../cloud/api'
import MasterEditor from '../components/MasterEditor'
import { createMovement, isHowell, pairNumbers, type Movement } from '../tournament/movement'
import { nameSide, pairLabel, pairNames, type PairNames, type Side } from '../tournament/pairs'
import { formatResult, resultKey, type Results } from '../tournament/results'
import { progressCount } from './progress'
import { combinedStandings, computeStandings, type Standing } from '../tournament/standings'
import { useTimer } from '../timer/useTimer'
import TimerControl from './TimerControl'
import type { TdTournament } from './tdStorage'
import { useTdLive } from './useTdLive'

const MINUTES_PER_BOARD = 7.5

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`
}

function ProgressGrid({ m, results, currentRound, openBoard }: {
  m: Movement
  results: Results
  currentRound: number | null
  openBoard: (b: number) => void
}) {
  const single = m.rounds.length === 1
  const tables = Array.from({ length: m.tables }, (_, i) => i + 1)
  const boards = single ? m.rounds[0][0].boards : []
  return (
    <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">Masalar</h2>
      <table className="border-separate border-spacing-1 text-center text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="w-16" />
            {single
              ? boards.map(b => (
                  <th key={b}>
                    <button type="button" onClick={() => openBoard(b)} className="h-7 w-8 rounded font-semibold hover:bg-emerald-50" title={`Board ${b} sonuçları`}>
                      {b}
                    </button>
                  </th>
                ))
              : m.rounds.map((_, i) => (
                  <th key={i} className={`min-w-20 rounded px-2 py-1 ${currentRound === i + 1 ? 'bg-emerald-100 text-emerald-900' : ''}`}>
                    {i + 1}. tur
                  </th>
                ))}
          </tr>
        </thead>
        <tbody>
          {tables.map(t => (
            <tr key={t}>
              <th className="pr-2 text-left font-semibold whitespace-nowrap">Masa {t}</th>
              {single
                ? boards.map(b => {
                    const a = m.rounds[0][t - 1]
                    const r = a.ew === null ? undefined : results[resultKey(b, a.ns)]
                    return (
                      <td
                        key={b}
                        title={r ? `Board ${b}: ${formatResult(r)} (K-G ${signed(r.nsScore)})` : `Board ${b}: girilmedi`}
                        className={`h-8 w-8 rounded ${a.ew === null ? 'bg-slate-50' : r ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}
                      >
                        {r ? '✓' : ''}
                      </td>
                    )
                  })
                : m.rounds.map((tablesInRound, i) => {
                    const a = tablesInRound[t - 1]
                    if (a.ew === null) return <td key={i} className="rounded bg-slate-50 text-xs text-slate-400">bye</td>
                    const done = a.boards.filter(b => results[resultKey(b, a.ns)]).length
                    const all = a.boards.length
                    return (
                      <td
                        key={i}
                        title={`Boardlar ${a.boards.join(', ')} · K-G ${a.ns} – D-B ${a.ew}`}
                        className={`h-9 rounded font-semibold ${
                          done === all ? 'bg-emerald-500 text-white' : done > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {done}/{all}
                      </td>
                    )
                  })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function StandingList({ title, list, side, howell, names }: {
  title: string
  list: Standing[]
  side: Side
  howell: boolean
  names: PairNames
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-500">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {list.map(s => (
            <tr key={s.pair} className="border-t border-slate-100">
              <td className="w-8 py-1.5 font-bold">{s.top > 0 ? s.place : '–'}</td>
              <td className="py-1.5">
                <span className="font-semibold">{pairLabel(howell, side, s.pair)}</span>{' '}
                <span className="text-slate-600">{pairNames(names, nameSide(howell, side), s.pair)}</span>
              </td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{s.top > 0 ? `%${s.percent.toFixed(1)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LiveTab({ td, onFinished }: { td: TdTournament; onFinished: () => void }) {
  const m = createMovement(td.pairCount, td.boardsPerRound, td.movement)
  const howell = isHowell(m)
  const { results, setResults, names, live, error } = useTdLive(td.id)
  const { timer, now, setLocal } = useTimer(td.id)
  const [editBoard, setEditBoard] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const finished = Boolean(td.finished)

  if (editBoard !== null) {
    return (
      <div className="mx-auto max-w-xl">
        <MasterEditor
          name={td.name}
          m={m}
          results={results}
          initialBoard={editBoard}
          backLabel="Canlı ekran"
          save={(board, ns, r) => adminWriteResult(td.id, td.adminSecret, board, ns, r)}
          onResults={setResults}
          back={() => setEditBoard(null)}
        />
      </div>
    )
  }

  const { done, total } = progressCount(m, results)
  const { ns, ew } = pairNumbers(m)
  const st = howell ? combinedStandings(results, ns) : computeStandings(results, ns, ew)
  const allBoards = [...new Set(m.rounds.flat().flatMap(a => a.boards))].sort((x, y) => x - y)
  const suggested = Math.round(td.boardsPerRound * MINUTES_PER_BOARD)

  return (
    <div className="space-y-6">
      <TimerControl
        td={td}
        rounds={m.rounds.length}
        suggestedMinutes={suggested}
        disabled={finished}
        timer={timer}
        now={now}
        setLocal={setLocal}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <div className="text-sm text-slate-500">Girilen skor</div>
              <div className="text-2xl font-bold">
                {done} <span className="text-slate-400">/ {total}</span>
              </div>
            </div>
            <div className="h-3 min-w-40 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${total ? (100 * done) / total : 0}%` }} />
            </div>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {live ? 'Canlı' : 'Bağlanıyor…'}
            </span>
            {finished ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">🏁 Bitirildi · skorlar kilitli</span>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="h-11 rounded-xl bg-slate-800 px-4 font-semibold text-white disabled:opacity-40"
                onClick={async () => {
                  const missing = total - done
                  const warn = missing > 0 ? `\n\nDikkat: ${missing} skor henüz girilmedi.` : ''
                  if (!window.confirm(`Turnuva bitirilsin mi? Skorlar kilitlenir ve turnuva arşive geçer.${warn}`)) return
                  setBusy(true)
                  setMsg(null)
                  try {
                    if (!(await finishTournament(td.id, td.adminSecret))) throw new Error('Bitirilemedi: yetki yok.')
                    onFinished()
                  } catch (e) {
                    setMsg((e as Error).message)
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                🏁 Turnuvayı bitir
              </button>
            )}
          </section>
          {(error || msg) && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error ?? msg}</p>}

          <ProgressGrid m={m} results={results} currentRound={timer?.round ?? null} openBoard={setEditBoard} />

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Board sonuçları ve düzeltme</h2>
            <p className="mb-3 text-sm text-slate-500">
              {finished
                ? 'Turnuva bitti: skorlar sadece Arşiv\'den kulüp yöneticisi parolasıyla düzeltilebilir.'
                : 'Bir boarda tıkla: bütün masaların sonuçlarını gör, gerekirse düzelt ya da sil.'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allBoards.map(b => {
                const n = Object.values(results).filter(r => r.board === b).length
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={finished}
                    onClick={() => setEditBoard(b)}
                    className="h-10 min-w-10 rounded-lg bg-slate-100 px-2 font-semibold hover:bg-emerald-100 disabled:opacity-50"
                    title={`${n} sonuç`}
                  >
                    {b}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <section className="h-fit space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">Canlı sıralama</h2>
          {howell ? (
            <StandingList title="Bütün çiftler" list={st.ns} side="NS" howell names={names} />
          ) : (
            <>
              <StandingList title="Kuzey-Güney" list={st.ns} side="NS" howell={false} names={names} />
              <StandingList title="Doğu-Batı" list={st.ew} side="EW" howell={false} names={names} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
