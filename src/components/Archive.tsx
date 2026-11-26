// Kulüp arşivi: bitirilmiş turnuvaların listesi ve salt okunur sonuçları.

import { useEffect, useState } from 'react'
import { adminDeleteTournament, fetchPairs, fetchResults, listArchive, verifyMaster, type ArchiveEntry } from '../cloud/api'
import { createMovement } from '../tournament/movement'
import type { Tournament } from '../tournament/storage'
import MasterEditor from './MasterEditor'
import SecurityQuestion from './SecurityQuestion'
import Standings from './Standings'
import { Card } from './ui'

const KIND_LABEL = { stationary: 'Sabit masalar', howell: 'Howell', mitchell: 'Mitchell' } as const

function kindLabel(e: ArchiveEntry) {
  if (e.movement) return KIND_LABEL[e.movement]
  return e.pairCount === 4 ? 'Howell' : 'Mitchell'
}

// ---------------- Yönetici girişi ----------------

function MasterLogin({ onLogin }: { onLogin: (password: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-2xl text-sm font-medium text-slate-500">
        🔑 Yönetici girişi
      </button>
    )
  }
  return (
    <Card className="space-y-3">
      <div className="font-medium">Kulüp yöneticisi parolası</div>
      <input
        type="password"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-xl tracking-[0.3em]"
        value={pw}
        onChange={e => {
          setPw(e.target.value)
          setMsg(null)
        }}
        autoComplete="off"
        inputMode="numeric"
      />
      {msg && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl bg-slate-100 text-sm font-medium">
          Vazgeç
        </button>
        <button
          type="button"
          disabled={!pw || busy}
          className="h-11 rounded-xl bg-slate-800 text-sm font-semibold text-white disabled:opacity-40"
          onClick={async () => {
            setBusy(true)
            try {
              const r = await verifyMaster(pw)
              if (r.ok) onLogin(pw)
              else if (r.locked) setMsg('Çok fazla yanlış deneme: yönetici girişi kilitlendi. Kilidi Supabase panelinden açabilirsin.')
              else if (!r.configured) setMsg('Yönetici parolası henüz ayarlanmamış.')
              else setMsg('Parola yanlış.')
            } catch (e) {
              setMsg((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Giriş
        </button>
      </div>
    </Card>
  )
}

export default function Archive() {
  const [list, setList] = useState<ArchiveEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<{ entry: ArchiveEntry; tournament: Tournament } | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // Parola sadece bu oturum boyunca bellekte tutulur; sayfa kapanınca unutulur.
  const [master, setMaster] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState(false)
  // Güvenlik cevabı: ilk kayıtta sorulur, bu oturum boyunca bellekte kalır (Çıkış'ta unutulur)
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState<((a: string | null) => void) | null>(null)
  const getAnswer = () =>
    answer !== null ? Promise.resolve(answer) : new Promise<string | null>(resolve => setAsking(() => resolve))
  const logout = (m: string | null) => {
    setMaster(m)
    if (m === null) setAnswer(null)
  }
  const question = master && asking && (
    <SecurityQuestion
      password={master}
      onDone={a => {
        if (a !== null) setAnswer(a)
        asking(a)
        setAsking(null)
      }}
    />
  )

  useEffect(() => {
    let cancelled = false
    listArchive()
      .then(l => !cancelled && setList(l))
      .catch(e => !cancelled && setError((e as Error).message))
    return () => {
      cancelled = true
    }
  }, [reload])

  const remove = async (e: ArchiveEntry) => {
    if (!master) return
    if (!window.confirm(`"${e.name}" (${e.date}) turnuvası skorları ve isimleriyle birlikte kalıcı olarak silinsin mi?`)) return
    const a = await getAnswer()
    if (a === null) return
    try {
      const ok = await adminDeleteTournament(e.id, master, a)
      if (!ok) {
        setError('Silinemedi: parola/güvenlik cevabı artık geçerli değil ya da turnuva zaten silinmiş.')
        logout(null)
      }
      setReload(r => r + 1)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (open) {
    const t = open.tournament
    const m = createMovement(t.pairCount, t.boardsPerRound, t.movement)
    if (editing && master) {
      return (
        <>
          <MasterEditor
            tournamentId={open.entry.id}
            name={t.name}
            m={m}
            results={t.results}
            password={master}
            getAnswer={getAnswer}
            onResults={results => setOpen({ ...open, tournament: { ...t, results } })}
            back={() => setEditing(false)}
          />
          {question}
        </>
      )
    }
    return (
      <Standings
        tournament={t}
        m={m}
        back={() => {
          setOpen(null)
          setEditing(false)
        }}
        backLabel="Arşiv"
        banner={
          <>
            <Card className="text-sm text-slate-500">
              {open.entry.finishedAt ? '🏁' : '🟢'} {t.date} · {t.pairCount} çift · {kindLabel(open.entry)} ·{' '}
              {open.entry.finishedAt ? 'Skorlar kilitli' : 'Devam ediyor (anlık görüntü)'}
            </Card>
            {master && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="h-12 w-full rounded-2xl bg-slate-800 font-semibold text-white"
              >
                🔑 Skorları düzelt (yönetici)
              </button>
            )}
          </>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-lg font-bold">Kulüp arşivi</div>
        <div className="text-sm text-slate-500">
          Bütün turnuvalar, en yeni üstte. Turnuvalar bitirilince ya da 24 saat sonra kilitlenir.
        </div>
      </Card>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!list && !error && <Card className="text-center text-sm text-slate-500">Yükleniyor…</Card>}
      {list && list.length === 0 && (
        <Card className="text-center text-sm text-slate-500">
          Henüz turnuva yok.
        </Card>
      )}

      {list && list.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {list.map(e => (
            <div key={e.id} className="flex items-center border-t border-slate-100 first:border-t-0">
              <button
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
                        createdAt: Date.parse(e.createdAt),
                        results,
                        names,
                        finished: Boolean(e.finishedAt),
                      },
                    })
                  } catch (err) {
                    setError((err as Error).message)
                  } finally {
                    setLoadingId(null)
                  }
                }}
                className="flex flex-1 items-center justify-between px-4 py-3 text-left active:bg-emerald-50"
              >
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-slate-500">
                    {e.date} · {e.pairCount} çift · {kindLabel(e)}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2 pl-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${
                      e.finishedAt ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {e.finishedAt ? 'Bitti' : 'Devam ediyor'}
                  </span>
                  <span className="text-sm text-slate-400">{loadingId === e.id ? '…' : '›'}</span>
                </span>
              </button>
              {master && (
                <button
                  type="button"
                  aria-label={`${e.name} sil`}
                  onClick={() => void remove(e)}
                  className="px-4 py-3 text-lg text-red-600 active:bg-red-50"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {cloudAdminBar(master, logout)}
      {question}
    </div>
  )
}

function cloudAdminBar(master: string | null, setMaster: (m: string | null) => void) {
  if (!master) return <MasterLogin onLogin={setMaster} />
  return (
    <Card className="flex items-center justify-between gap-3 text-sm">
      <span>🔑 Yönetici modu: turnuvaları 🗑 ile silebilirsin</span>
      <button type="button" onClick={() => setMaster(null)} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
        Çıkış
      </button>
    </Card>
  )
}
