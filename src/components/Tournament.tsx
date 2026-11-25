import { useMemo, useState } from 'react'
import { MAX_PAIRS, MIN_PAIRS, mitchell } from '../tournament/movement'
import { loadTournament, saveTournament, type Tournament as T } from '../tournament/storage'

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
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-slate-100 text-xl disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >−</button>
        <span className="w-8 text-center text-2xl font-bold">{value}</span>
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-slate-100 text-xl disabled:opacity-30"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >+</button>
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
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
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
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
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
      </section>

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
          })
        }
      >
        Turnuvayı oluştur
      </button>
    </div>
  )
}

// ---------------- Hareket görünümü ----------------

function MovementView({ tournament, onReset }: { tournament: T; onReset: () => void }) {
  const m = useMemo(() => mitchell(tournament.pairCount, tournament.boardsPerRound), [tournament])
  const [round, setRound] = useState(1)
  const assignments = m.rounds[round - 1]

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-bold">{tournament.name}</div>
        <div className="text-sm text-slate-500">
          {tournament.date} · {tournament.pairCount} çift · {m.tables} masa · {m.rounds.length} tur ·{' '}
          {tournament.boardsPerRound} board/tur
        </div>
      </section>

      <section className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <button
          className="h-10 w-10 rounded-full bg-slate-100 text-xl disabled:opacity-30"
          disabled={round <= 1}
          onClick={() => setRound(r => r - 1)}
        >−</button>
        <div className="text-center">
          <div className="text-sm text-slate-500">Tur</div>
          <div className="text-3xl font-bold">
            {round}<span className="text-lg text-slate-400"> / {m.rounds.length}</span>
          </div>
        </div>
        <button
          className="h-10 w-10 rounded-full bg-slate-100 text-xl disabled:opacity-30"
          disabled={round >= m.rounds.length}
          onClick={() => setRound(r => r + 1)}
        >+</button>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Masa</th>
              <th className="px-3 py-2">K-G</th>
              <th className="px-3 py-2">D-B</th>
              <th className="px-3 py-2 text-right">Boardlar</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.table} className="border-t border-slate-100">
                <td className="px-3 py-3 text-lg font-bold">{a.table}</td>
                <td className="px-3 py-3">{a.ns}</td>
                <td className="px-3 py-3">
                  {a.ew ?? <span className="text-sm text-amber-700">oturur</span>}
                </td>
                <td className="px-3 py-3 text-right font-medium">{boardRange(a.boards)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="px-1 text-xs text-slate-500">
        Her turdan sonra: K-G çiftleri yerinde kalır, D-B çiftleri bir üst masaya, boardlar bir alt masaya geçer.
        {m.type === 'skip-mitchell' && ` ${Math.floor(m.tables / 2) + 1}. turda D-B çiftleri bir masa atlar.`}
      </p>

      <button
        type="button"
        className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
        onClick={() => {
          if (window.confirm('Bu turnuva silinip yenisi kurulacak. Emin misin?')) onReset()
        }}
      >
        Yeni turnuva kur
      </button>
    </div>
  )
}

// ---------------- Sekme ----------------

export default function Tournament() {
  const [tournament, setTournament] = useState<T | null>(() => loadTournament())

  const update = (t: T | null) => {
    saveTournament(t)
    setTournament(t)
  }

  return tournament ? (
    <MovementView tournament={tournament} onReset={() => update(null)} />
  ) : (
    <Setup onCreate={update} />
  )
}
