// Hakem paneli · Kayıtlı oyuncular: master point numarası, ad soyad, kategori.
import { useMemo, useState } from 'react'
import { deletePlayer, importPlayers, upsertPlayer, type Player } from '../cloud/api'
import { isMpNo, PLAYER_CATEGORIES, type PlayerCategory } from '../tournament/pairs'
import { parsePlayers } from './parsePlayers'

const EMPTY = { mpNo: '', name: '', category: '' as PlayerCategory | '' }

export default function PlayersTab({ players, password, reload }: {
  players: Player[]
  password: string
  reload: () => Promise<void>
}) {
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null) // düzenlenen oyuncunun numarası
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [bulk, setBulk] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase('tr').trim()
    if (!q) return players
    return players.filter(p => p.mpNo.includes(q) || p.name.toLocaleLowerCase('tr').includes(q))
  }, [players, query])

  const existing = players.find(p => p.mpNo === form.mpNo.trim())
  const valid = isMpNo(form.mpNo) && form.name.trim().length > 0

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
      await reload()
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const ok = await upsertPlayer(password, { mpNo: form.mpNo.trim(), name: form.name, category: form.category || null })
      if (!ok) throw new Error('Kaydedilemedi: hakem şifresi kabul edilmedi.')
      const text = `${form.name.trim()} ${existing ? 'güncellendi' : 'eklendi'}.`
      setForm(EMPTY)
      setEditing(null)
      return text
    })

  const parsed = bulk !== null ? parsePlayers(bulk) : null

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{editing ? 'Oyuncuyu düzelt' : 'Oyuncu ekle'}</h2>
          <label className="block">
            <span className="text-sm text-slate-500">Master point numarası</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-lg disabled:bg-slate-100"
              value={form.mpNo}
              disabled={editing !== null}
              inputMode="numeric"
              onChange={e => setForm({ ...form, mpNo: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-500">Ad soyad</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
              value={form.name}
              maxLength={60}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div>
            <span className="text-sm text-slate-500">Kategori</span>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {(['', ...PLAYER_CATEGORIES] as const).map(c => (
                <button
                  key={c || 'yok'}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`h-10 rounded-xl border text-sm font-medium ${
                    form.category === c ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {c || 'Yok'}
                </button>
              ))}
            </div>
          </div>
          {existing && !editing && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              {form.mpNo} numarası zaten kayıtlı ({existing.name}). Kaydedersen güncellenir.
            </p>
          )}
          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setForm(EMPTY)
                }}
                className="h-11 flex-1 rounded-xl bg-slate-100 font-medium"
              >
                Vazgeç
              </button>
            )}
            <button
              type="button"
              disabled={!valid || busy}
              onClick={() => void save()}
              className="h-11 flex-[2] rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-40"
            >
              {editing ? 'Düzeltmeyi kaydet' : 'Ekle'}
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Toplu ekle</h2>
          {bulk === null ? (
            <>
              <p className="text-sm text-slate-500">
                Excel'den numara, isim ve kategori sütunlarını kopyalayıp yapıştırabilirsin.
              </p>
              <button type="button" onClick={() => setBulk('')} className="h-10 w-full rounded-xl border border-slate-300 text-sm font-medium">
                Listeyi yapıştır
              </button>
            </>
          ) : (
            <>
              <textarea
                className="h-40 w-full rounded-xl border border-slate-300 p-2 font-mono text-sm"
                placeholder={'1234\tAyşe Yılmaz\tKadın\n2001;Mehmet Kaya;Senyör\n3005,Ali Can'}
                value={bulk}
                onChange={e => setBulk(e.target.value)}
              />
              {parsed && (parsed.players.length > 0 || parsed.errors.length > 0) && (
                <div className="text-sm">
                  <p className="text-emerald-800">{parsed.players.length} oyuncu okundu.</p>
                  {parsed.errors.slice(0, 5).map(e => (
                    <p key={e} className="text-red-700">{e}</p>
                  ))}
                  {parsed.errors.length > 5 && <p className="text-red-700">… ve {parsed.errors.length - 5} hata daha</p>}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setBulk(null)} className="h-10 flex-1 rounded-xl bg-slate-100 text-sm font-medium">
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={!parsed || parsed.players.length === 0 || busy}
                  className="h-10 flex-[2] rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      const n = await importPlayers(password, parsed!.players)
                      if (n < 0) throw new Error('Eklenemedi: hakem şifresi kabul edilmedi.')
                      setBulk(null)
                      return `${n} oyuncu eklendi/güncellendi.`
                    })
                  }
                >
                  {parsed?.players.length ?? 0} oyuncuyu ekle
                </button>
              </div>
            </>
          )}
        </section>

        {msg && (
          <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold">Kayıtlı oyuncular</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{players.length}</span>
          <input
            className="ml-auto w-64 rounded-xl border border-slate-300 px-3 py-1.5"
            placeholder="İsim ya da numara ara"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {players.length === 0 ? (
          <p className="p-6 text-center text-slate-500">Henüz kayıtlı oyuncu yok. Soldan ekleyebilirsin.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Numara</th>
                <th className="px-4 py-2 font-medium">Ad soyad</th>
                <th className="px-4 py-2 font-medium">Kategori</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.mpNo} className={`border-t border-slate-100 ${editing === p.mpNo ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-2 font-mono">{p.mpNo}</td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{p.category ?? '–'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-3 text-sm font-medium text-emerald-800"
                      onClick={() => {
                        setEditing(p.mpNo)
                        setForm({ mpNo: p.mpNo, name: p.name, category: p.category ?? '' })
                      }}
                    >
                      Düzelt
                    </button>
                    <button
                      type="button"
                      aria-label={`${p.name} sil`}
                      className="text-sm font-medium text-red-600"
                      onClick={() => {
                        if (!window.confirm(`${p.name} (${p.mpNo}) listeden silinsin mi?`)) return
                        void run(async () => {
                          if (!(await deletePlayer(password, p.mpNo))) throw new Error('Silinemedi.')
                          return `${p.name} silindi.`
                        })
                      }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
