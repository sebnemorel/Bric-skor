// "Masam" modu ekranları: masa seçici ve tek masanın ekranı.

import { useState } from 'react'
import type { Movement } from '../tournament/movement'
import { pairNames, type Side } from '../tournament/pairs'
import { currentRound, roundDone, seat, transition } from '../tournament/myTable'
import { formatResult, resultKey, tableProgress } from '../tournament/results'
import type { Tournament } from '../tournament/storage'
import { ablative, dative } from '../tr'
import { BoardMeta } from './BoardHeader'
import { Card, RoundButton } from './ui'

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const range = (b: number[]) => (b.length === 1 ? `${b[0]}` : `${b[0]}–${b[b.length - 1]}`)

// ---------------- Masa seçici ----------------

export function TablePicker({ tournament, m, onPick, onAll }: {
  tournament: Tournament
  m: Movement
  onPick: (table: number) => void
  onAll: () => void
}) {
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-500">{tournament.name}</div>
        <div className="text-2xl font-bold">Hangi masadasın?</div>
        <p className="mt-1 text-sm text-slate-500">
          Bu telefon masada kalır; ekranda sadece bu masanın boardları ve rakipleri görünür.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: m.tables }, (_, i) => i + 1).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className="flex h-20 flex-col items-center justify-center rounded-2xl bg-white shadow-sm active:bg-emerald-50"
          >
            <span className="text-xs text-slate-500">Masa</span>
            <span className="text-3xl font-bold">{t}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onAll} className="h-12 w-full rounded-2xl bg-white text-sm font-medium text-slate-600 shadow-sm">
        Tüm masaları gör (hakem / yönetici)
      </button>
    </div>
  )
}

// ---------------- Masam ekranı ----------------

export function MyTableView({ tournament, m, table, openBoard, openStandings, onChangeTable, onShowAll, onEditPair, codeBox }: {
  tournament: Tournament
  m: Movement
  table: number
  openBoard: (round: number, board: number) => void
  onEditPair: (side: Side, number: number) => void
  openStandings: () => void
  onChangeTable: () => void
  onShowAll: () => void
  codeBox?: React.ReactNode
}) {
  const auto = currentRound(m, tournament.results, table)
  const [manual, setManual] = useState<number | null>(null)
  const round = manual ?? auto ?? m.rounds.length
  const a = seat(m, round, table)
  const finished = auto === null
  // Yeni tura geçildiyse ve henüz skor girilmediyse: önceki turdan bu tura nasıl geçileceğini göster
  const prevTr = round > 1 ? transition(m, round - 1, table) : null
  const prev = round > 1 ? seat(m, round - 1, table) : null
  const showMove =
    prevTr !== null &&
    prev !== null &&
    roundDone(m, tournament.results, round - 1, table) &&
    tableProgress(a, tournament.results).done === 0 &&
    !(finished && manual === null)

  return (
    <div className="space-y-4">
      {codeBox}

      <Card className="text-center">
        <div className="text-sm text-slate-500">{tournament.name}</div>
        <div className="text-4xl font-bold">Masa {table}</div>
        <div className="mt-3 flex items-center justify-between">
          <RoundButton disabled={round <= 1} onClick={() => setManual(round - 1)}>−</RoundButton>
          <div>
            <div className="text-xs text-slate-500">Tur</div>
            <div className="text-2xl font-bold">
              {round}<span className="text-base text-slate-400"> / {m.rounds.length}</span>
            </div>
          </div>
          <RoundButton disabled={round >= m.rounds.length} onClick={() => setManual(round + 1)}>+</RoundButton>
        </div>
        {manual !== null && manual !== auto && (
          <button type="button" onClick={() => setManual(null)} className="mt-2 text-sm font-medium text-emerald-800">
            {finished ? 'Son tura dön' : `Şu anki tura dön (Tur ${auto})`}
          </button>
        )}
      </Card>

      {showMove && prevTr && prev && (
        <Card className="space-y-2 border-2 border-emerald-600">
          <div className="font-bold text-emerald-800">Tur {round - 1} bitti ✓ · Masalar değişiyor</div>
          <ul className="space-y-1.5 text-sm">
            {prevTr.boardsTo !== null && prevTr.boardsTo !== table && (
              <li>📦 Tur {round - 1} boardlarını ({range(prev.boards)}) <b>Masa {dative(prevTr.boardsTo)}</b> ver.</li>
            )}
            {prev.ew !== null && prevTr.ewTo !== null && prevTr.ewTo !== table && (
              <li>🚶 D-B {prev.ew} çifti <b>Masa {dative(prevTr.ewTo)}</b> geçer.</li>
            )}
            {a.ew !== null && (
              <li>
                ➡️ Şimdi <b>D-B {a.ew}</b> geliyor, boardlar <b>{range(a.boards)}</b>
                {prevTr.boardsFrom !== null && prevTr.boardsFrom !== table && <> (Masa {ablative(prevTr.boardsFrom)} gelir)</>}.
              </li>
            )}
          </ul>
        </Card>
      )}

      {finished && manual === null ? (
        <Card className="space-y-3 text-center">
          <div className="text-4xl">🎉</div>
          <div className="text-lg font-bold">Bu masanın tüm skorları girildi</div>
          <p className="text-sm text-slate-500">Diğer masalar bitince sıralama kesinleşir.</p>
          <button type="button" onClick={openStandings} className="h-12 w-full rounded-xl bg-amber-400 font-semibold text-slate-900">
            🏆 Sıralama ve sonuçlar
          </button>
        </Card>
      ) : a.ew === null ? (
        <Card className="text-center">
          <div className="text-lg font-bold">Bu tur oturuyorsunuz</div>
          <p className="text-sm text-slate-500">K-G {a.ns} bu turda oynamıyor. Sıradaki tura geçmek için + ile ilerleyin.</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-2">
            {([['NS', a.ns], ['EW', a.ew]] as const).map(([side, n]) => {
              const label = pairNames(tournament.names, side, n)
              return (
                <div key={side} className="flex items-center gap-3">
                  <div className="w-14 shrink-0">
                    <div className="text-xs text-slate-500">{side === 'NS' ? 'K-G' : 'D-B'}</div>
                    <div className="text-2xl font-bold leading-none">{n}</div>
                  </div>
                  <div className={`flex-1 ${label ? 'font-medium' : 'text-sm text-slate-400'}`}>{label || 'İsim girilmedi'}</div>
                  <button
                    type="button"
                    onClick={() => onEditPair(side, n)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      label ? 'bg-slate-100 text-slate-600' : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {label ? 'Düzelt' : 'İsim gir'}
                  </button>
                </div>
              )
            })}
            <div className="border-t border-slate-100 pt-2 text-sm text-slate-500">
              Boardlar: <b className="text-slate-900">{range(a.boards)}</b>
            </div>
          </Card>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {a.boards.map(b => {
              const r = tournament.results[resultKey(b, a.ns)]
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => openBoard(round, b)}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-4 text-left first:border-t-0 active:bg-emerald-50"
                >
                  <div>
                    <div className="text-lg font-bold">Board {b}</div>
                    <div className="text-xs text-slate-500"><BoardMeta board={b} /></div>
                  </div>
                  {r ? (
                    <div className="text-right">
                      <div className="font-medium">{formatResult(r)}</div>
                      <div className="text-sm text-slate-500">K-G {signed(r.nsScore)}</div>
                    </div>
                  ) : (
                    <span className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white">Gir</span>
                  )}
                </button>
              )
            })}
          </section>
        </>
      )}

      {!finished && (
        <button type="button" onClick={openStandings} className="h-11 w-full rounded-2xl bg-amber-400 text-sm font-semibold text-slate-900">
          🏆 Ara sıralama
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onChangeTable} className="h-11 rounded-2xl bg-white text-sm font-medium text-slate-600 shadow-sm">
          Masayı değiştir
        </button>
        <button type="button" onClick={onShowAll} className="h-11 rounded-2xl bg-white text-sm font-medium text-slate-600 shadow-sm">
          Tüm masalar
        </button>
      </div>
    </div>
  )
}
