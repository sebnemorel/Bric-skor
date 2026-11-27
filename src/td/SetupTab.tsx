// Hakem paneli · Turnuva kurulumu: hareket, çift/board sayısı ve çiftlerin oyuncuları (numarayla).
import { useState } from 'react'
import { createTournament, newAdminSecret, upsertPair, type Player } from '../cloud/api'
import {
  availableKinds,
  createMovement,
  isHowell,
  MAX_PAIRS,
  MAX_STATIONARY_BOARDS,
  MIN_PAIRS,
  pairNumbers,
  type MovementKind,
} from '../tournament/movement'
import {
  CATEGORIES,
  pairCategoriesFromPlayers,
  pairKey,
  pairLabel,
  type Category,
  type PairInfo,
  type Side,
} from '../tournament/pairs'
import type { TdTournament } from './tdStorage'

const KINDS: { id: MovementKind; label: string; hint: string }[] = [
  { id: 'stationary', label: 'Sabit masalar', hint: 'Çiftler bütün akşam aynı masada, her masa aynı boardları oynar' },
  { id: 'howell', label: 'Howell', hint: 'Sadece 4 çift: herkes herkesle oynar, tek sıralama' },
  { id: 'mitchell', label: 'Mitchell', hint: '5+ çift: K-G sabit, D-B ve boardlar her tur yer değiştirir' },
]

/** Bir oyuncu kutusunun çözümlenmiş hali. */
interface Slot {
  text: string // hakemin yazdığı: numara, "numara · isim" ya da misafir için isim
}

function resolve(text: string, byNo: Map<string, Player>): { mp?: string; name: string; player?: Player; unknownNo?: boolean } {
  const t = text.trim()
  const m = t.match(/^([0-9]{1,10})(?:\s*·.*)?$/)
  if (m) {
    const player = byNo.get(m[1])
    return player ? { mp: m[1], name: player.name, player } : { name: '', unknownNo: true }
  }
  return { name: t.replace(/\s+/g, ' ').slice(0, 60) } // misafir: sadece isim
}

function PlayerInput({ value, onChange, byNo, label }: {
  value: Slot
  onChange: (s: Slot) => void
  byNo: Map<string, Player>
  label: string
}) {
  const r = resolve(value.text, byNo)
  return (
    <div className="min-w-0 flex-1">
      <input
        aria-label={label}
        list="td-players"
        className={`w-full rounded-lg border px-2 py-1.5 ${r.unknownNo ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
        placeholder="Numara ya da isim"
        value={value.text}
        onChange={e => onChange({ text: e.target.value })}
      />
      <div className="mt-0.5 h-4 truncate text-xs">
        {r.player ? (
          <span className="text-emerald-800">
            ✓ {r.player.name}
            {r.player.categories.length > 0 && <span className="text-slate-500"> · {r.player.categories.join(', ')}</span>}
          </span>
        ) : r.unknownNo ? (
          <span className="text-red-700">Bu numara kayıtlı değil</span>
        ) : r.name ? (
          <span className="text-slate-500">Misafir (kayıtsız)</span>
        ) : null}
      </div>
    </div>
  )
}

interface PairForm {
  p1: Slot
  p2: Slot
  categories: Category[] | null // null = oyunculardan otomatik
}

export default function SetupTab({ players, onCreated }: { players: Player[]; onCreated: (t: Omit<TdTournament, 'createdAt'>) => void }) {
  const [name, setName] = useState('Kulüp Turnuvası')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('tr-TR'))
  const [pairCount, setPairCount] = useState(8)
  const [kind, setKind] = useState<MovementKind>('stationary')
  const [totalBoards, setTotalBoards] = useState(24)
  const [boardsPerRound, setBoardsPerRound] = useState(3)
  const [pin, setPin] = useState('')
  const [pairs, setPairs] = useState<Record<string, PairForm>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byNo = new Map(players.map(p => [p.mpNo, p]))
  const kinds = availableKinds(pairCount)
  const valid = kinds.includes(kind)
  const boards = kind === 'stationary' ? totalBoards : boardsPerRound
  const m = valid ? createMovement(pairCount, boards, kind) : null
  const howell = m ? isHowell(m) : false

  const rows: { key: string; side: Side; n: number }[] = []
  if (m) {
    const { ns, ew } = pairNumbers(m)
    ns.forEach(n => rows.push({ key: pairKey('NS', n), side: 'NS', n }))
    ew.forEach(n => rows.push({ key: pairKey('EW', n), side: 'EW', n }))
  }

  const pf = (key: string): PairForm => pairs[key] ?? { p1: { text: '' }, p2: { text: '' }, categories: null }
  const setPf = (key: string, f: Partial<PairForm>) => setPairs(prev => ({ ...prev, [key]: { ...pf(key), ...f } }))

  const info = (key: string): PairInfo | null => {
    const f = pf(key)
    const a = resolve(f.p1.text, byNo)
    const b = resolve(f.p2.text, byNo)
    if (!a.name && !b.name) return null
    return {
      player1: a.name,
      player2: b.name,
      mp1: a.mp,
      mp2: b.mp,
      categories: f.categories ?? pairCategoriesFromPlayers(a.player?.categories, b.player?.categories),
    }
  }

  // aynı oyuncu iki kez seçildiyse uyar
  const used = new Map<string, number>()
  for (const r of rows) {
    const i = info(r.key)
    for (const no of [i?.mp1, i?.mp2]) if (no) used.set(no, (used.get(no) ?? 0) + 1)
  }
  const duplicates = [...used].filter(([, c]) => c > 1).map(([no]) => `${byNo.get(no)?.name ?? no} (${no})`)
  const unknown = rows.some(r => {
    const f = pf(r.key)
    return resolve(f.p1.text, byNo).unknownNo || resolve(f.p2.text, byNo).unknownNo
  })
  const pinOk = pin === '' || /^[0-9]{4,6}$/.test(pin)
  const canCreate = Boolean(m) && name.trim() !== '' && pinOk && duplicates.length === 0 && !unknown && !busy

  const create = async () => {
    if (!m) return
    setBusy(true)
    setError(null)
    try {
      const adminSecret = newAdminSecret()
      const input = { name: name.trim(), date: date.trim(), pairCount, boardsPerRound: boards, movement: kind }
      const { id, code } = await createTournament({ ...input, adminSecret, pin: pin || undefined })
      for (const r of rows) {
        const i = info(r.key)
        if (i) await upsertPair(id, r.key, i)
      }
      onCreated({ ...input, id, code, adminSecret })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const num = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Number(v.replace(/\D/g, '')) || min))

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <datalist id="td-players">
        {players.map(p => (
          <option key={p.mpNo} value={`${p.mpNo} · ${p.name}`} />
        ))}
      </datalist>

      <section className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Yeni turnuva</h2>
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <label className="block">
            <span className="text-sm text-slate-500">Turnuva adı</span>
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-slate-500">Tarih</span>
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-slate-500">Çift sayısı ({MIN_PAIRS}–{MAX_PAIRS})</span>
          <input
            type="number"
            min={MIN_PAIRS}
            max={MAX_PAIRS}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
            value={pairCount}
            onChange={e => setPairCount(num(e.target.value, MIN_PAIRS, MAX_PAIRS))}
          />
        </label>

        <div>
          <span className="text-sm text-slate-500">Hareket</span>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {KINDS.map(k => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`h-10 rounded-xl border text-sm font-semibold ${
                  kind === k.id
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : kinds.includes(k.id)
                      ? 'border-slate-300 bg-white'
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{KINDS.find(k => k.id === kind)!.hint}</p>
          {!valid && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              {kind === 'stationary'
                ? 'Sabit masalarda çift sayısı çift olmalı (4, 6, 8…).'
                : kind === 'howell'
                  ? 'Howell şimdilik sadece 4 çift için hazır.'
                  : 'Mitchell için en az 5 çift gerekir.'}
            </p>
          )}
        </div>

        {kind === 'stationary' ? (
          <label className="block">
            <span className="text-sm text-slate-500">Toplam board (her masa hepsini oynar)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
              value={totalBoards}
              onChange={e => setTotalBoards(num(e.target.value, 1, MAX_STATIONARY_BOARDS))}
            />
          </label>
        ) : (
          <label className="block">
            <span className="text-sm text-slate-500">Tur başına board</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
              value={boardsPerRound}
              onChange={e => setBoardsPerRound(num(e.target.value, 1, 8))}
            />
          </label>
        )}
        {m && (
          <p className="text-sm text-slate-600">
            {m.tables} masa · {m.rounds.length} tur · toplam {m.rounds.length * (kind === 'stationary' ? totalBoards : boardsPerRound)} board
            {m.rounds.length > 1 && kind !== 'stationary' ? ' (her masa)' : ''}
          </p>
        )}

        <label className="block">
          <span className="text-sm text-slate-500">Hakem şifresi (isteğe bağlı, 4–6 rakam)</span>
          <input
            className={`mt-1 w-full rounded-xl border px-3 py-2 tracking-widest ${pinOk ? 'border-slate-300' : 'border-red-300 bg-red-50'}`}
            value={pin}
            inputMode="numeric"
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <span className="text-xs text-slate-500">Telefondan hakem yetkisi almak için. Bu bilgisayar zaten hakemdir.</span>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-baseline gap-3 border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold">Çiftler</h2>
          <span className="text-sm text-slate-500">
            Master point numarasını yaz ya da isimle ara. Kayıtsız misafir için sadece ismini yaz. Boş bırakılan çiftleri masada da
            girebilirler.
          </span>
        </div>
        {!m ? (
          <p className="p-6 text-center text-slate-500">Önce geçerli bir hareket seç.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(r => {
              const f = pf(r.key)
              const auto = pairCategoriesFromPlayers(resolve(f.p1.text, byNo).player?.categories, resolve(f.p2.text, byNo).player?.categories)
              const cats = f.categories ?? auto
              return (
                <div key={r.key} className="flex items-start gap-3 px-4 py-2">
                  <div className="w-20 shrink-0 pt-2 font-semibold">{pairLabel(howell, r.side, r.n)}</div>
                  <PlayerInput label={`${pairLabel(howell, r.side, r.n)} 1. oyuncu`} value={f.p1} byNo={byNo} onChange={s => setPf(r.key, { p1: s })} />
                  <PlayerInput label={`${pairLabel(howell, r.side, r.n)} 2. oyuncu`} value={f.p2} byNo={byNo} onChange={s => setPf(r.key, { p2: s })} />
                  <div className="flex w-64 shrink-0 flex-wrap items-center gap-1 pt-1" aria-label={`${pairLabel(howell, r.side, r.n)} kategoriler`}>
                    {CATEGORIES.filter(c => c !== 'Açık').map(c => {
                      const on = cats.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={on}
                          title={f.categories ? 'Elle seçildi' : 'Oyunculardan otomatik'}
                          onClick={() => setPf(r.key, { categories: CATEGORIES.filter(x => (x === c ? !on : cats.includes(x))) })}
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                            on ? (f.categories ? 'border-slate-800 bg-slate-800 text-white' : 'border-emerald-600 bg-emerald-600 text-white') : 'border-slate-200 text-slate-400'
                          }`}
                        >
                          {c}
                        </button>
                      )
                    })}
                    {f.categories && (
                      <button type="button" className="text-xs text-slate-500 underline" onClick={() => setPf(r.key, { categories: null })}>
                        otomatik
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-2 border-t border-slate-100 p-4">
          {duplicates.length > 0 && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Aynı oyuncu birden fazla çiftte: {duplicates.join(', ')}</p>
          )}
          {unknown && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Kayıtlı olmayan numara var. Oyuncular sekmesinden ekle ya da ismini yaz.</p>}
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => void create()}
            className="h-12 w-full rounded-xl bg-emerald-700 text-lg font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Kuruluyor…' : 'Turnuvayı kur ve masa QR\'larını hazırla'}
          </button>
        </div>
      </section>
    </div>
  )
}

