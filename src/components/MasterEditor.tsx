// Skor düzeltme ekranı: board seç → masaya dokun → düzelt/sil.
// Arşivde kulüp yöneticisi, hakem panelinde hakem kullanır; kaydetme işi `save` ile dışarıdan verilir.
import { useState } from 'react'
import type { Movement } from '../tournament/movement'
import {
  DEFAULT_ENTRY,
  entryScore,
  makeResult,
  resultKey,
  resultToEntry,
  type BoardResult,
  type ContractEntry,
  type Results,
} from '../tournament/results'
import { BoardMeta } from './BoardHeader'
import { BoardAllResults } from './BoardResultViews'
import ContractForm from './ContractForm'
import { BackButton, Card, ScoreBoxes } from './ui'

type Slot = { round: number; table: number; ns: number }

export default function MasterEditor({ name, m, results, save, onResults, back, backLabel = 'Sıralama', initialBoard }: {
  name: string
  m: Movement
  results: Results
  /** Sunucuya yazar (r = null → siler). true: kaydedildi, false: yetki reddedildi, null: vazgeçildi. */
  save: (board: number, ns: number, r: BoardResult | null) => Promise<boolean | null>
  onResults: (r: Results) => void
  back: () => void
  backLabel?: string
  initialBoard?: number
}) {
  const boards = [...new Set(m.rounds.flat().flatMap(a => a.boards))].sort((x, y) => x - y)
  const [board, setBoard] = useState(initialBoard ?? boards[0] ?? 1)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [entry, setEntry] = useState<ContractEntry>(DEFAULT_ENTRY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const write = async (s: Slot, value: ContractEntry | null) => {
    const a = m.rounds[s.round - 1][s.table - 1]
    const key = resultKey(board, a.ns)
    const r = value ? makeResult(a, s.round, board, value) : null
    setError(null)
    setBusy(true)
    try {
      const ok = await save(board, a.ns, r)
      if (ok === null) return
      if (!ok) {
        setError('Kaydedilemedi: yetki kabul edilmedi (parola/şifre ya da turnuva kilitli).')
        return
      }
      const next = { ...results }
      if (r) next[key] = r
      else delete next[key]
      onResults(next)
      setSlot(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (slot) {
    const existing = results[resultKey(board, slot.ns)]
    const a = m.rounds[slot.round - 1][slot.table - 1]
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSlot(null)}>Board {board}</BackButton>
        <Card className="text-center">
          <div className="text-sm text-slate-500">
            🔑 Yönetici düzeltmesi · Masa {a.table} · K-G {a.ns} vs D-B {a.ew}
          </div>
          <div className="text-3xl font-bold">Board {board}</div>
          <div className="text-xs text-slate-500"><BoardMeta board={board} /></div>
        </Card>
        <ContractForm value={entry} onChange={setEntry} />
        <ScoreBoxes nsScore={entryScore(board, entry)} />
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={busy}
          className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white disabled:opacity-50"
          onClick={() => void write(slot, entry)}
        >
          {existing ? 'Düzeltmeyi kaydet' : 'Skoru kaydet'}
        </button>
        {existing && (
          <button
            type="button"
            disabled={busy}
            className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
            onClick={() => {
              if (window.confirm(`Board ${board}, Masa ${a.table} skoru silinsin mi?`)) void write(slot, null)
            }}
          >
            Skoru sil
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <BackButton onClick={back}>{backLabel}</BackButton>
      <Card>
        <div className="text-lg font-bold">🔑 Skor düzelt</div>
        <div className="text-sm text-slate-500">{name} · Board seç, sonra düzeltilecek masaya dokun.</div>
      </Card>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {boards.map(b => (
          <button
            key={b}
            type="button"
            onClick={() => setBoard(b)}
            className={`h-11 min-w-11 shrink-0 rounded-xl px-2 font-semibold ${
              b === board ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 shadow-sm'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <BoardAllResults
        m={m}
        results={results}
        board={board}
        onPick={s => {
          const r = results[resultKey(board, s.ns)]
          setEntry(r ? resultToEntry(r) : DEFAULT_ENTRY)
          setError(null)
          setSlot(s)
        }}
      />
    </div>
  )
}
