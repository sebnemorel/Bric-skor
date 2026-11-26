// Kulüp arşivi: bitirilmiş turnuvaların listesi ve salt okunur sonuçları.

import { useEffect, useState } from 'react'
import { fetchPairs, fetchResults, listArchive, type ArchiveEntry } from '../cloud/api'
import { createMovement } from '../tournament/movement'
import type { Tournament } from '../tournament/storage'
import Standings from './Standings'
import { Card } from './ui'

const KIND_LABEL = { stationary: 'Sabit masalar', howell: 'Howell', mitchell: 'Mitchell' } as const

function kindLabel(e: ArchiveEntry) {
  if (e.movement) return KIND_LABEL[e.movement]
  return e.pairCount === 4 ? 'Howell' : 'Mitchell'
}

export default function Archive() {
  const [list, setList] = useState<ArchiveEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<{ entry: ArchiveEntry; tournament: Tournament } | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listArchive()
      .then(l => !cancelled && setList(l))
      .catch(e => !cancelled && setError((e as Error).message))
    return () => {
      cancelled = true
    }
  }, [])

  if (open) {
    const t = open.tournament
    const m = createMovement(t.pairCount, t.boardsPerRound, t.movement)
    return (
      <Standings
        tournament={t}
        m={m}
        back={() => setOpen(null)}
        backLabel="Arşiv"
        banner={
          <Card className="text-sm text-slate-500">
            🏁 {t.date} · {t.pairCount} çift · {kindLabel(open.entry)} · Skorlar kilitli
          </Card>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-lg font-bold">Kulüp arşivi</div>
        <div className="text-sm text-slate-500">Bitirilen turnuvalar. Açmak için dokun.</div>
      </Card>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!list && !error && <Card className="text-center text-sm text-slate-500">Yükleniyor…</Card>}
      {list && list.length === 0 && (
        <Card className="text-center text-sm text-slate-500">
          Henüz bitirilmiş turnuva yok. Hakem turnuvanın sonunda "Turnuvayı bitir ve arşive koy" deyince burada görünür.
        </Card>
      )}

      {list && list.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {list.map(e => (
            <button
              key={e.id}
              type="button"
              disabled={loadingId !== null}
              onClick={async () => {
                setLoadingId(e.id)
                setError(null)
                try {
                  const [results, names] = await Promise.all([fetchResults(e.id), fetchPairs(e.id)])
                  setOpen({
                    entry: e,
                    tournament: {
                      name: e.name,
                      date: e.date,
                      pairCount: e.pairCount,
                      boardsPerRound: e.boardsPerRound,
                      movement: e.movement ?? undefined,
                      createdAt: Date.parse(e.finishedAt),
                      results,
                      names,
                      finished: true,
                    },
                  })
                } catch (err) {
                  setError((err as Error).message)
                } finally {
                  setLoadingId(null)
                }
              }}
              className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left first:border-t-0 active:bg-emerald-50"
            >
              <div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-slate-500">
                  {e.date} · {e.pairCount} çift · {kindLabel(e)}
                </div>
              </div>
              <span className="text-sm text-slate-400">{loadingId === e.id ? '…' : '›'}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
