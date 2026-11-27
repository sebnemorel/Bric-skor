// Hakem paneli (bilgisayar): /hakem adresinde açılır.
// Kulüp hakem şifresiyle girilir; şifre sadece bu sayfa açıkken bellekte tutulur.
import { useCallback, useEffect, useState } from 'react'
import { cloudEnabled, fetchPairs, listPlayers, verifyTd, type Player } from '../cloud/api'
import type { PairNames } from '../tournament/pairs'
import PlayersTab from './PlayersTab'
import SetupTab from './SetupTab'
import TableQRs from './TableQRs'
import { loadTd, saveTd, type TdTournament } from './tdStorage'

const KIND_LABEL = { stationary: 'Sabit masalar', howell: 'Howell', mitchell: 'Mitchell' } as const

function Login({ onLogin }: { onLogin: (password: string) => void }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <form
      className="mx-auto mt-16 max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      onSubmit={async e => {
        e.preventDefault()
        setBusy(true)
        setMsg(null)
        try {
          const r = await verifyTd(pw)
          if (r.ok) onLogin(pw)
          else if (r.locked) setMsg('Çok fazla yanlış deneme: hakem girişi kilitlendi. Kulüp yöneticisi Supabase panelinden açabilir.')
          else if (!r.configured) setMsg('Kulüp hakem şifresi henüz ayarlanmamış.')
          else setMsg('Şifre yanlış.')
        } catch (err) {
          setMsg((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div>
        <h2 className="text-xl font-bold">Hakem girişi</h2>
        <p className="text-sm text-slate-500">Kulüp hakem şifresini gir.</p>
      </div>
      <input
        type="password"
        autoFocus
        autoComplete="off"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
        value={pw}
        onChange={e => {
          setPw(e.target.value)
          setMsg(null)
        }}
      />
      {msg && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={!pw || busy} className="h-11 w-full rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-40">
        {busy ? '…' : 'Giriş'}
      </button>
    </form>
  )
}

function Ready({ t, onNew }: { t: TdTournament; onNew: () => void }) {
  const [names, setNames] = useState<PairNames>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPairs(t.id)
      .then(setNames)
      .catch(e => setError((e as Error).message))
  }, [t.id])

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-6 rounded-2xl bg-white p-5 shadow-sm print:hidden">
        <div>
          <div className="text-sm text-slate-500">
            {t.date} · {t.pairCount} çift · {KIND_LABEL[t.movement]}
          </div>
          <h2 className="text-2xl font-bold">{t.name}</h2>
        </div>
        <div className="rounded-xl bg-slate-100 px-4 py-2 text-center">
          <div className="text-xs text-slate-500">Turnuva kodu</div>
          <div className="font-mono text-2xl font-bold tracking-widest">{t.code}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => window.print()} className="h-11 rounded-xl bg-emerald-700 px-5 font-semibold text-white">
            🖨 Masa QR'larını yazdır
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Yeni turnuva kurulsun mu? Bu turnuva silinmez, telefonlarda ve arşivde kalır; sadece bu bilgisayarın ekranından kalkar.',
                )
              )
                onNew()
            }}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 font-medium"
          >
            Yeni turnuva
          </button>
        </div>
      </section>

      <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 print:hidden">
        Her masaya kendi QR'ını koy. Masadaki telefon QR'ı okutunca doğrudan bu turnuvaya ve o masaya bağlanır. Canlı kontrol ekranı
        (masa tablosu, tur süresi, sıralama) bir sonraki adımda bu sayfaya gelecek.
      </p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 print:hidden">{error}</p>}

      <TableQRs t={t} names={names} />
    </div>
  )
}

export default function TdPanel() {
  const [password, setPassword] = useState<string | null>(null)
  const [tab, setTab] = useState<'tournament' | 'players'>('tournament')
  const [players, setPlayers] = useState<Player[]>([])
  const [td, setTd] = useState<TdTournament | null>(loadTd)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPlayers(await listPlayers())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])


  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 print:hidden">
        <img src="/icon-192-v2.png" alt="" className="h-9 w-9 rounded-lg" />
        <h1 className="text-lg font-bold">
          Briç Skor Akdeniz <span className="font-normal text-slate-500">· Hakem Paneli</span>
        </h1>
        {password && (
          <nav className="ml-6 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                ['tournament', 'Turnuva'],
                ['players', `Oyuncular (${players.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`h-9 rounded-lg px-4 text-sm font-medium ${tab === id ? 'bg-white shadow-sm' : 'text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-4 text-sm">
          {password && (
            <button type="button" onClick={() => setPassword(null)} className="font-medium text-slate-600">
              Çıkış
            </button>
          )}
          <a href="/" className="font-medium text-emerald-800">
            Uygulamaya dön
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6 print:p-0">
        {!cloudEnabled ? (
          <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Hakem paneli için sunucu bağlantısı gerekli.</p>
        ) : !password ? (
          <Login
            onLogin={pw => {
              setPassword(pw)
              void reload()
            }}
          />
        ) : (
          <>
            {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {tab === 'players' ? (
              <PlayersTab players={players} password={password} reload={reload} />
            ) : td ? (
              <Ready
                t={td}
                onNew={() => {
                  saveTd(null)
                  setTd(null)
                }}
              />
            ) : (
              <SetupTab
                players={players}
                onCreated={created => {
                  const t = { ...created, createdAt: Date.now() }
                  saveTd(t)
                  setTd(t)
                }}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
