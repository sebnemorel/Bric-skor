import { useMemo, useState } from 'react'
import { MAX_PAIRS, MIN_PAIRS, mitchell, type Movement } from '../tournament/movement'
import {
  DEFAULT_ENTRY,
  entryScore,
  formatResult,
  makeResult,
  resultKey,
  resultToEntry,
  tableProgress,
  type ContractEntry,
} from '../tournament/results'
import { loadTournament, saveTournament, type Tournament as T } from '../tournament/storage'
import { BoardMeta } from './BoardHeader'
import ContractForm from './ContractForm'
import Standings from './Standings'
import { BackButton, Card, RoundButton, ScoreBoxes } from './ui'

const MINUTES_PER_BOARD = 7.5

function Stepper({ label, value, min, max, onChange }: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <RoundButton disabled={value <= min} onClick={() => onChange(value - 1)}>−</RoundButton>
        <span className="w-8 text-center text-2xl font-bold">{value}</span>
        <RoundButton disabled={value >= max} onClick={() => onChange(value + 1)}>+</RoundButton>
      </div>
    </div>
  )
}

function boardRange(boards: number[]) {
  return boards.length === 1 ? `${boards[0]}` : `${boards[0]}–${boards[boards.length - 1]}`
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`
}

// ---------------- Kurulum formu ----------------

function Setup({ onCreate }: { onCreate: (t: T) => void }) {
  const [name, setName] = useState('Kulüp Turnuvası')
  const [pairCount, setPairCount] = useState(12)
  const [boardsPerRound, setBoardsPerRound] = useState(3)

  const m = mitchell(pairCount, boardsPerRound)
  const roundCount = m.rounds.length
  const minutes = roundCount * boardsPerRound * MINUTES_PER_BOARD

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-500">Turnuva adı</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <Stepper label="Çift sayısı" value={pairCount} min={MIN_PAIRS} max={MAX_PAIRS} onChange={setPairCount} />
        <Stepper label="Tur başına board" value={boardsPerRound} min={1} max={8} onChange={setBoardsPerRound} />
      </Card>

      <Card>
        <div className="mb-2 text-sm font-medium text-slate-500">Özet</div>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-500">Hareket</dt>
          <dd className="text-right font-medium">{m.type === 'mitchell' ? 'Mitchell' : 'Skip Mitchell'}</dd>
          <dt className="text-slate-500">Masa</dt>
          <dd className="text-right font-medium">{m.tables}</dd>
          <dt className="text-slate-500">Tur</dt>
          <dd className="text-right font-medium">{roundCount}</dd>
          <dt className="text-slate-500">Oynanan board</dt>
          <dd className="text-right font-medium">{roundCount * boardsPerRound}</dd>
          <dt className="text-slate-500">Hazırlanacak board</dt>
          <dd className="text-right font-medium">1–{m.totalBoards}</dd>
          <dt className="text-slate-500">Tahmini süre</dt>
          <dd className="text-right font-medium">{formatDuration(minutes)}</dd>
        </dl>
        {m.missingEW !== null && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Çift sayısı tek: D-B {m.missingEW} yok, her tur bir K-G çifti oturur.
          </p>
        )}
        {m.type === 'skip-mitchell' && (
          <p className="mt-3 rounded-lg bg-sky-50 p-2 text-sm text-sky-800">
            Masa sayısı çift: {Math.floor(m.tables / 2) + 1}. turdan itibaren D-B çiftleri bir masa atlar.
          </p>
        )}
      </Card>

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white disabled:opacity-40"
        disabled={!name.trim()}
        onClick={() =>
          onCreate({
            name: name.trim(),
            date: new Date().toLocaleDateString('tr-TR'),
            pairCount,
            boardsPerRound,
            createdAt: Date.now(),
            results: {},
          })
        }
      >
        Turnuvayı oluştur
      </button>
    </div>
  )
}

// ---------------- Tur tablosu ----------------

function RoundView({ tournament, m, round, setRound, openTable, openStandings, onReset }: {
  tournament: T
  m: Movement
  round: number
  setRound: (r: number) => void
  openTable: (table: number) => void
  openStandings: () => void
  onReset: () => void
}) {
  const assignments = m.rounds[round - 1]
  const entered = Object.keys(tournament.results).length
  const expected = m.rounds.flat().filter(a => a.ew !== null).length * m.boardsPerRound

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-lg font-bold">{tournament.name}</div>
        <div className="text-sm text-slate-500">
          {tournament.date} · {tournament.pairCount} çift · {m.tables} masa · {m.rounds.length} tur ·{' '}
          {tournament.boardsPerRound} board/tur
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-600" style={{ width: `${(entered / expected) * 100}%` }} />
        </div>
        <div className="mt-1 text-xs text-slate-500">{entered} / {expected} skor girildi</div>
        <button
          type="button"
          onClick={openStandings}
          className="mt-3 h-11 w-full rounded-xl bg-amber-400 font-semibold text-slate-900"
        >
          🏆 Sıralama ve sonuçlar
        </button>
      </Card>

      <Card className="flex items-center justify-between">
        <RoundButton disabled={round <= 1} onClick={() => setRound(round - 1)}>−</RoundButton>
        <div className="text-center">
          <div className="text-sm text-slate-500">Tur</div>
          <div className="text-3xl font-bold">
            {round}<span className="text-lg text-slate-400"> / {m.rounds.length}</span>
          </div>
        </div>
        <RoundButton disabled={round >= m.rounds.length} onClick={() => setRound(round + 1)}>+</RoundButton>
      </Card>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Masa</th>
              <th className="px-3 py-2">K-G</th>
              <th className="px-3 py-2">D-B</th>
              <th className="px-3 py-2">Board</th>
              <th className="px-3 py-2 text-right">Skor</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => {
              const { done, total } = tableProgress(a, tournament.results)
              const complete = total > 0 && done === total
              return (
                <tr
                  key={a.table}
                  onClick={() => a.ew !== null && openTable(a.table)}
                  className={`border-t border-slate-100 ${a.ew !== null ? 'cursor-pointer active:bg-emerald-50' : ''}`}
                >
                  <td className="px-3 py-3 text-lg font-bold">{a.table}</td>
                  <td className="px-3 py-3">{a.ns}</td>
                  <td className="px-3 py-3">{a.ew ?? <span className="text-sm text-amber-700">oturur</span>}</td>
                  <td className="px-3 py-3 text-sm">{boardRange(a.boards)}</td>
                  <td className="px-3 py-3 text-right text-sm font-medium">
                    {a.ew === null ? '' : complete ? (
                      <span className="text-emerald-700">✓</span>
                    ) : (
                      <span className="text-slate-500">{done}/{total} ›</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <p className="px-1 text-xs text-slate-500">
        Skor girmek için masaya dokun. Her turdan sonra K-G çiftleri yerinde kalır, D-B çiftleri bir üst masaya,
        boardlar bir alt masaya geçer.
        {m.type === 'skip-mitchell' && ` ${Math.floor(m.tables / 2) + 1}. turda D-B çiftleri bir masa atlar.`}
      </p>

      <button
        type="button"
        className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
        onClick={() => {
          if (window.confirm('Bu turnuva ve girilen tüm skorlar silinecek. Emin misin?')) onReset()
        }}
      >
        Yeni turnuva kur
      </button>
    </div>
  )
}

// ---------------- Masa ekranı ----------------

function TableView({ tournament, m, round, table, back, openBoard }: {
  tournament: T
  m: Movement
  round: number
  table: number
  back: () => void
  openBoard: (board: number) => void
}) {
  const a = m.rounds[round - 1][table - 1]

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>Tur {round} tablosu</BackButton>

      <Card className="text-center">
        <div className="text-sm text-slate-500">Tur {round}</div>
        <div className="text-3xl font-bold">Masa {table}</div>
        <div className="mt-1 text-slate-600">K-G {a.ns} · D-B {a.ew}</div>
      </Card>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {a.boards.map(b => {
          const r = tournament.results[resultKey(b, a.ns)]
          return (
            <button
              key={b}
              type="button"
              onClick={() => openBoard(b)}
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
    </div>
  )
}

// ---------------- Board skor girişi ----------------

function BoardEntry({ tournament, m, round, table, board, back, save, remove }: {
  tournament: T
  m: Movement
  round: number
  table: number
  board: number
  back: () => void
  save: (entry: ContractEntry) => void
  remove: () => void
}) {
  const a = m.rounds[round - 1][table - 1]
  const existing = tournament.results[resultKey(board, a.ns)]
  const [entry, setEntry] = useState<ContractEntry>(() => (existing ? resultToEntry(existing) : DEFAULT_ENTRY))

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>Masa {table}</BackButton>

      <Card className="text-center">
        <div className="text-sm text-slate-500">Masa {table} · K-G {a.ns} vs D-B {a.ew}</div>
        <div className="text-3xl font-bold">Board {board}</div>
        <div className="text-xs text-slate-500"><BoardMeta board={board} /></div>
      </Card>

      <ContractForm value={entry} onChange={setEntry} />
      <ScoreBoxes nsScore={entryScore(board, entry)} />

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
        onClick={() => save(entry)}
      >
        {existing ? 'Düzeltmeyi kaydet' : 'Kaydet'}
      </button>
      {existing && (
        <button
          type="button"
          className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
          onClick={() => {
            if (window.confirm(`Board ${board} skoru silinsin mi?`)) remove()
          }}
        >
          Skoru sil
        </button>
      )}
    </div>
  )
}

// ---------------- Sekme ----------------

type View =
  | { kind: 'round' }
  | { kind: 'table'; table: number }
  | { kind: 'board'; table: number; board: number }
  | { kind: 'standings' }

export default function Tournament() {
  const [tournament, setTournament] = useState<T | null>(() => loadTournament())
  const [round, setRound] = useState(1)
  const [view, setView] = useState<View>({ kind: 'round' })

  const m = useMemo(
    () => (tournament ? mitchell(tournament.pairCount, tournament.boardsPerRound) : null),
    [tournament],
  )

  const update = (t: T | null) => {
    saveTournament(t)
    setTournament(t)
  }

  if (!tournament || !m) {
    return (
      <Setup
        onCreate={t => {
          update(t)
          setRound(1)
          setView({ kind: 'round' })
        }}
      />
    )
  }

  if (view.kind === 'standings') {
    return <Standings tournament={tournament} m={m} back={() => setView({ kind: 'round' })} />
  }

  if (view.kind === 'table') {
    return (
      <TableView
        tournament={tournament}
        m={m}
        round={round}
        table={view.table}
        back={() => setView({ kind: 'round' })}
        openBoard={board => setView({ kind: 'board', table: view.table, board })}
      />
    )
  }

  if (view.kind === 'board') {
    const a = m.rounds[round - 1][view.table - 1]
    const key = resultKey(view.board, a.ns)
    const backToTable = () => setView({ kind: 'table', table: view.table })
    return (
      <BoardEntry
        key={key}
        tournament={tournament}
        m={m}
        round={round}
        table={view.table}
        board={view.board}
        back={backToTable}
        save={entry => {
          update({ ...tournament, results: { ...tournament.results, [key]: makeResult(a, round, view.board, entry) } })
          backToTable()
        }}
        remove={() => {
          const results = { ...tournament.results }
          delete results[key]
          update({ ...tournament, results })
          backToTable()
        }}
      />
    )
  }

  return (
    <RoundView
      tournament={tournament}
      m={m}
      round={round}
      setRound={setRound}
      openTable={table => setView({ kind: 'table', table })}
      openStandings={() => setView({ kind: 'standings' })}
      onReset={() => update(null)}
    />
  )
}
