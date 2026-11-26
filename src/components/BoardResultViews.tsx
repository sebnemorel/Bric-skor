// Skor özeti (rakip onayı için) ve bir boardun bütün masalardaki sonuçları.
import type { Movement } from '../tournament/movement'
import { boardSlots, formatResult, resultKey, type ContractEntry, type Results } from '../tournament/results'
import { Card } from './ui'

const STRAIN_SYMBOL = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' } as const
const SEAT = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' } as const

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 py-2.5 first:border-t-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-lg font-semibold">{children}</span>
    </div>
  )
}

/** Rakibin kontrol edeceği özet: kontrat, deklaran, yeşil/kırmızı, sonuç, puan. */
export function ResultSummary({ entry, nsScore, nsLabel, ewLabel }: {
  entry: ContractEntry
  nsScore: number
  nsLabel: string
  ewLabel: string
}) {
  const tricks = entry.contract.level + 6 + entry.result
  const declSide = entry.declarer === 'N' || entry.declarer === 'S' ? nsLabel : ewLabel
  return (
    <Card>
      {entry.passed ? (
        <Row label="Kontrat">Dört pas</Row>
      ) : (
        <>
          <Row label="Kontrat">
            <span className={entry.contract.strain === 'D' || entry.contract.strain === 'H' ? 'text-red-600' : ''}>
              {entry.contract.level}
              {STRAIN_SYMBOL[entry.contract.strain]}
            </span>
            {entry.contract.doubling}
          </Row>
          <Row label="Oynayan">
            {SEAT[entry.declarer]} <span className="text-sm font-normal text-slate-500">({declSide})</span>
          </Row>
          <Row label="Yeşil / Kırmızı">
            {entry.vul === true ? (
              <span className="rounded-full bg-red-600 px-3 py-0.5 text-base text-white">Kırmızı</span>
            ) : (
              <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-base text-white">
                Yeşil{entry.vul === null && <span className="font-normal opacity-80"> (seçilmedi)</span>}
              </span>
            )}
          </Row>
          <Row label="Sonuç">
            {entry.result === 0 ? '=' : signed(entry.result)}{' '}
            <span className="text-sm font-normal text-slate-500">({tricks} levée)</span>
          </Row>
        </>
      )}
      <Row label="Puan">
        {nsScore === 0 ? (
          '0'
        ) : (
          <>
            <span className="text-emerald-700">+{Math.abs(nsScore)}</span>{' '}
            <span className="text-sm font-normal text-slate-500">({nsScore > 0 ? nsLabel : ewLabel} çifti)</span>
          </>
        )}
      </Row>
    </Card>
  )
}

/** Bir boardun bütün masalardaki sonuçları (bu masa vurgulanır). */
export function BoardAllResults({ m, results, board, highlightNs, onPick }: {
  m: Movement
  results: Results
  board: number
  highlightNs?: number
  onPick?: (slot: { round: number; table: number; ns: number }) => void
}) {
  const slots = boardSlots(m, board)
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
        <span>Masa / çiftler</span>
        <span>Sonuç</span>
        <span className="w-14 text-right">K-G</span>
      </div>
      {slots.map(({ round, a }) => {
        const r = results[resultKey(board, a.ns)]
        const mine = a.ns === highlightNs
        const Tag = onPick ? 'button' : 'div'
        return (
          <Tag
            key={`${round}-${a.table}`}
            type={onPick ? 'button' : undefined}
            onClick={onPick ? () => onPick({ round, table: a.table, ns: a.ns }) : undefined}
            className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-slate-100 px-4 py-3 text-left ${
              mine ? 'bg-emerald-50' : ''
            } ${onPick ? 'active:bg-emerald-50' : ''}`}
          >
            <span>
              <span className="font-semibold">Masa {a.table}</span>
              {m.rounds.length > 1 && <span className="text-xs text-slate-500"> · Tur {round}</span>}
              <span className="block text-xs text-slate-500">
                K-G {a.ns} – D-B {a.ew}
                {mine && ' · sizin masa'}
              </span>
            </span>
            <span className="text-sm font-medium">{r ? formatResult(r) : '—'}</span>
            <span className="w-14 text-right font-semibold">{r ? signed(r.nsScore) : ''}</span>
          </Tag>
        )
      })}
    </section>
  )
}
