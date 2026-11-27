import { useEffect, useMemo, useRef, useState } from 'react'
import {
  cloudEnabled,
  createTournament,
  deleteTournament,
  finishTournament,
  joinTournament,
  newAdminSecret,
  verifyAdminPin,
} from '../cloud/api'
import { isValidCode, normalizeCode } from '../cloud/sync'
import { useCloudSync, type SyncStatus } from '../cloud/useCloudSync'
import {
  availableKinds,
  createMovement,
  isHowell,
  MAX_PAIRS,
  MAX_STATIONARY_BOARDS,
  MIN_PAIRS,
  type Movement,
  type MovementKind,
} from '../tournament/movement'
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
import { BoardAllResults, ResultSummary } from './BoardResultViews'
import ContractForm from './ContractForm'
import { MyTableView, TablePicker } from './MyTable'
import { PairEditor, PairsView } from './Pairs'
import { nameSide, pairNames, type Side } from '../tournament/pairs'
import Standings from './Standings'
import TimerBar from '../timer/TimerBar'
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

type NewTournament = Pick<T, 'name' | 'date' | 'pairCount' | 'boardsPerRound' | 'movement'>

const KIND_INFO: Record<MovementKind, { label: string; hint: string }> = {
  stationary: { label: 'Sabit masalar', hint: 'Çiftler bütün akşam aynı masada kalır, her masa aynı boardları oynar' },
  howell: { label: 'Howell', hint: 'Sadece 4 çift: herkes herkesle oynar, tek sıralama' },
  mitchell: { label: 'Mitchell', hint: '5+ çift: K-G sabit, D-B ve boardlar her tur yer değiştirir' },
}

const validPin = (pin: string) => pin === '' || /^[0-9]{4,6}$/.test(pin)

function Setup({ onCreate }: { onCreate: (t: NewTournament, shared: boolean, pin: string) => Promise<void> }) {
  const [name, setName] = useState('Kulüp Turnuvası')
  const [pairCount, setPairCount] = useState(4)
  const [kind, setKind] = useState<MovementKind>('stationary')
  const [totalBoards, setTotalBoards] = useState(12) // sabit masalar
  const [boardsPerRound, setBoardsPerRound] = useState(3) // Howell / Mitchell
  const [shared, setShared] = useState(cloudEnabled)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kinds = availableKinds(pairCount)
  const valid = kinds.includes(kind)
  const boards = kind === 'stationary' ? totalBoards : boardsPerRound
  const m = valid ? createMovement(pairCount, boards, kind) : null
  const roundCount = m?.rounds.length ?? 0
  const minutes = roundCount * boards * MINUTES_PER_BOARD

  const invalidReason =
    kind === 'stationary'
      ? 'Sabit masalarda her masada iki çift oturur: çift sayısı çift olmalı (4, 6, 8…).'
      : kind === 'howell'
        ? 'Howell şimdilik sadece 4 çift (2 masa) için hazır.'
        : 'Mitchell için en az 5 çift gerekir.'

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

        <div>
          <span className="text-sm font-medium text-slate-500">Hareket</span>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {(['stationary', 'howell', 'mitchell'] as const).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`h-11 rounded-xl border text-sm font-semibold ${
                  kind === k
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : kinds.includes(k)
                      ? 'border-slate-300 bg-white'
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {KIND_INFO[k].label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{KIND_INFO[kind].hint}</p>
        </div>

        {kind === 'stationary' ? (
          <Stepper label="Toplam board" value={totalBoards} min={1} max={MAX_STATIONARY_BOARDS} onChange={setTotalBoards} />
        ) : (
          <Stepper label="Tur başına board" value={boardsPerRound} min={1} max={8} onChange={setBoardsPerRound} />
        )}
      </Card>

      {!m ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {invalidReason}
          {kinds.length > 0 && ` Bu çift sayısıyla: ${kinds.map(k => KIND_INFO[k].label).join(', ')}.`}
        </p>
      ) : (
        <Card>
          <div className="mb-2 text-sm font-medium text-slate-500">Özet</div>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Hareket</dt>
            <dd className="text-right font-medium">
              {m.type === 'stationary' ? 'Sabit masalar' : m.type === 'howell' ? 'Howell' : m.type === 'mitchell' ? 'Mitchell' : 'Skip Mitchell'}
            </dd>
            <dt className="text-slate-500">Masa</dt>
            <dd className="text-right font-medium">{m.tables}</dd>
            <dt className="text-slate-500">Tur</dt>
            <dd className="text-right font-medium">{roundCount}</dd>
            <dt className="text-slate-500">Oynanan board</dt>
            <dd className="text-right font-medium">{roundCount * boards}</dd>
            <dt className="text-slate-500">Hazırlanacak board</dt>
            <dd className="text-right font-medium">1–{m.totalBoards}</dd>
            <dt className="text-slate-500">Tahmini süre</dt>
            <dd className="text-right font-medium">{formatDuration(minutes)}</dd>
          </dl>
          {m.type === 'stationary' && (
            <p className="mt-3 rounded-lg bg-sky-50 p-2 text-sm text-sky-800">
              Her masa 1–{m.totalBoards} arası boardların hepsini oynar; boardlar masalar arasında dolaştırılır.
              Aynı boardun farklı masalardaki skorları karşılaştırılır. K-G ve D-B ayrı sıralanır.
            </p>
          )}
          {m.missingEW !== null && (
            <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
              Çift sayısı tek: D-B {m.missingEW} yok, her tur bir K-G çifti oturur.
            </p>
          )}
          {m.type === 'howell' && (
            <p className="mt-3 rounded-lg bg-sky-50 p-2 text-sm text-sky-800">
              4 çift: herkes herkesle oynar, tek sıralama çıkar. Her turda iki masa aynı boardları oynar; yarısını
              oynayınca boardları diğer masayla değiştirin. Tur başına 6-8 board önerilir.
            </p>
          )}
          {m.type === 'skip-mitchell' && (
            <p className="mt-3 rounded-lg bg-sky-50 p-2 text-sm text-sky-800">
              Masa sayısı çift: {Math.floor(m.tables / 2) + 1}. turdan itibaren D-B çiftleri bir masa atlar.
            </p>
          )}
        </Card>
      )}

      {cloudEnabled && (
        <Card>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-emerald-700"
              checked={shared}
              onChange={e => setShared(e.target.checked)}
            />
            <span>
              <span className="font-medium">Diğer telefonlarla paylaş</span>
              <span className="block text-sm text-slate-500">
                Turnuvaya bir kod verilir; her masa kendi telefonundan skor girer, sıralama canlı güncellenir.
                İnternet gerekir.
              </span>
            </span>
          </label>
          {shared && (
            <label className="mt-4 block border-t border-slate-100 pt-3">
              <span className="text-sm font-medium text-slate-500">Hakem şifresi (isteğe bağlı)</span>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-lg tracking-[0.3em] ${
                  validPin(pin) ? 'border-slate-300' : 'border-red-400'
                }`}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="4-6 rakam"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Telefonunu değiştirirsen ya da turnuvadan çıkarsan, kodla katılıp bu şifreyle yönetici yetkisini
                (turnuvayı silme) geri alırsın. Unutma, kimseyle paylaşma.
              </span>
            </label>
          )}
        </Card>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white disabled:opacity-40"
        disabled={!name.trim() || busy || !m || (shared && !validPin(pin))}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            await onCreate(
              {
                name: name.trim(),
                date: new Date().toLocaleDateString('tr-TR'),
                pairCount,
                boardsPerRound: boards,
                movement: kind,
              },
              shared,
              shared ? pin : '',
            )
          } catch (e) {
            setError(
              `${(e as Error).message} İstersen "Diğer telefonlarla paylaş" seçeneğini kapatıp turnuvayı sadece bu telefonda kurabilirsin.`,
            )
            setBusy(false)
          }
        }}
      >
        {busy ? 'Oluşturuluyor…' : 'Turnuvayı oluştur'}
      </button>
    </div>
  )
}

// ---------------- Kodla katılma ----------------

function Join({ initialCode, onJoin }: { initialCode: string; onJoin: (code: string) => Promise<void> }) {
  const [code, setCode] = useState(normalizeCode(initialCode))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-500">Turnuva kodu</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-center font-mono text-3xl font-bold uppercase tracking-[0.3em]"
            value={code}
            onChange={e => {
              setCode(normalizeCode(e.target.value))
              setError(null)
            }}
            placeholder="KX4P92"
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
          />
        </label>
        <p className="text-sm text-slate-500">Kodu turnuvayı kuran kişiden al. 6 karakterdir.</p>
      </Card>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white disabled:opacity-40"
        disabled={!isValidCode(code) || busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            await onJoin(code)
          } catch (e) {
            setError((e as Error).message)
            setBusy(false)
          }
        }}
      >
        {busy ? 'Katılınıyor…' : 'Katıl'}
      </button>
    </div>
  )
}

function Start({ onCreate, onJoin }: {
  onCreate: (t: NewTournament, shared: boolean, pin: string) => Promise<void>
  onJoin: (code: string) => Promise<void>
}) {
  const initialCode = new URLSearchParams(window.location.search).get('kod') ?? ''
  const [mode, setMode] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')

  if (!cloudEnabled) return <Setup onCreate={onCreate} />

  return (
    <div className="space-y-4">
      <nav className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm">
        {(['create', 'join'] as const).map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`h-10 rounded-xl text-sm font-medium ${mode === id ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
          >
            {id === 'create' ? 'Yeni turnuva kur' : 'Kodla katıl'}
          </button>
        ))}
      </nav>
      {mode === 'create' ? <Setup onCreate={onCreate} /> : <Join initialCode={initialCode} onJoin={onJoin} />}
    </div>
  )
}

// ---------------- Kod ve bağlantı durumu ----------------

const STATUS_TEXT: Record<SyncStatus, { dot: string; text: string }> = {
  local: { dot: 'bg-slate-400', text: 'Sadece bu telefonda' },
  connecting: { dot: 'bg-amber-400', text: 'Bağlanıyor…' },
  live: { dot: 'bg-emerald-500', text: 'Canlı · skorlar herkesle paylaşılıyor' },
  offline: { dot: 'bg-red-500', text: 'Bağlantı yok' },
}

function CodeBox({ tournament, status, pendingCount }: { tournament: T; status: SyncStatus; pendingCount: number }) {
  const [copied, setCopied] = useState(false)
  const code = tournament.cloud!.code
  const link = `${window.location.origin}/?kod=${code}`

  const share = async () => {
    const text = `${tournament.name} turnuvasına katıl. Kod: ${code}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Briç Skor Akdeniz', text, url: link })
        return
      }
      await navigator.clipboard.writeText(`${text}\n${link}`)
      setCopied(true)
    } catch {
      // paylaşım iptal edildi
    }
  }

  const st = STATUS_TEXT[status]
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Turnuva kodu</div>
          <div className="font-mono text-2xl font-bold tracking-[0.2em]">{code}</div>
        </div>
        <button type="button" onClick={share} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
          {copied ? 'Kopyalandı ✓' : 'Paylaş'}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
        {st.text}
        {pendingCount > 0 && <span className="text-amber-700">· {pendingCount} skor gönderilmeyi bekliyor</span>}
      </div>
      {!tournament.finished && <TimerBar tournamentId={tournament.cloud!.id} />}
    </div>
  )
}

// ---------------- Hakem şifresiyle yönetici olma ----------------

function AdminClaim({ code, onClaim }: { code: string; onClaim: (pin: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-2xl bg-white text-sm font-medium text-slate-600">
        🔑 Hakem misin? Şifreyle yönetici ol
      </button>
    )
  }

  return (
    <Card className="space-y-3">
      <div className="font-medium">Hakem şifresi</div>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-2xl tracking-[0.4em]"
        value={pin}
        onChange={e => {
          setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
          setMsg(null)
        }}
        inputMode="numeric"
        autoComplete="off"
        placeholder="••••"
      />
      {msg && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl bg-slate-100 text-sm font-medium">
          Vazgeç
        </button>
        <button
          type="button"
          disabled={pin.length < 4 || busy}
          className="h-11 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-40"
          onClick={async () => {
            setBusy(true)
            try {
              const r = await verifyAdminPin(code, pin)
              if (r.ok) onClaim(pin)
              else if (r.locked) setMsg('Çok fazla yanlış deneme yapıldı, şifre kilitlendi. Turnuvayı kuran telefondan ya da Supabase panelinden işlem yapılabilir.')
              else if (!r.hasPin) setMsg('Bu turnuva kurulurken hakem şifresi belirlenmemiş.')
              else setMsg('Şifre yanlış.')
            } catch (e) {
              setMsg((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Onayla
        </button>
      </div>
    </Card>
  )
}

// ---------------- Tur tablosu ----------------

function RoundView({ tournament, m, round, setRound, openTable, openStandings, openPicker, openPairs, onLeave, onDelete, onFinish, onClaimAdmin, status, pendingCount }: {
  tournament: T
  m: Movement
  round: number
  setRound: (r: number) => void
  openTable: (table: number) => void
  openStandings: () => void
  openPicker: () => void
  openPairs: () => void
  onLeave: () => void
  onDelete: () => void
  onFinish: () => void
  onClaimAdmin: (pin: string) => void
  status: SyncStatus
  pendingCount: number
}) {
  const isCloud = Boolean(tournament.cloud)
  const isAdmin = Boolean(tournament.cloud?.adminSecret)
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
        {isCloud && <CodeBox tournament={tournament} status={status} pendingCount={pendingCount} />}
        <button
          type="button"
          onClick={openStandings}
          className="mt-3 h-11 w-full rounded-xl bg-amber-400 font-semibold text-slate-900"
        >
          🏆 Sıralama ve sonuçlar
        </button>
        <button
          type="button"
          onClick={openPicker}
          className="mt-2 h-11 w-full rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
        >
          📍 Bu telefon bir masada mı? Masamı seç
        </button>
        <button
          type="button"
          onClick={openPairs}
          className="mt-2 h-11 w-full rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
        >
          👥 Çiftler ve isimler
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
        Skor girmek için masaya dokun.{' '}
        {m.type === 'stationary'
          ? 'Sabit masalar: çiftler yerinde kalır; her masa bütün boardları oynar, boardlar masalar arasında dolaştırılır.'
          : isHowell(m)
            ? 'Howell: çiftler her tur tablodaki yerlerine geçer; iki masa aynı boardları oynar ve yarıda boardları değiştirir.'
            : 'Her turdan sonra K-G çiftleri yerinde kalır, D-B çiftleri bir üst masaya, boardlar bir alt masaya geçer.'}
        {m.type === 'skip-mitchell' && ` ${Math.floor(m.tables / 2) + 1}. turda D-B çiftleri bir masa atlar.`}
      </p>

      {!isCloud && (
        <button
          type="button"
          className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
          onClick={() => {
            if (window.confirm('Bu turnuva ve girilen tüm skorlar silinecek. Emin misin?')) onLeave()
          }}
        >
          Yeni turnuva kur
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          className="h-12 w-full rounded-2xl bg-slate-800 font-semibold text-white"
          onClick={() => {
            if (
              window.confirm(
                'Turnuva bitirilsin mi? Skorlar kilitlenir, kimse değiştiremez. Sonuçlar kulüp arşivinde herkese görünür.',
              )
            )
              onFinish()
          }}
        >
          🏁 Turnuvayı bitir ve arşive koy
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
          onClick={() => {
            if (window.confirm('Turnuva ve tüm skorlar HERKES İÇİN silinecek. Bu geri alınamaz. Emin misin?')) onDelete()
          }}
        >
          Turnuvayı herkes için sil
        </button>
      )}
      {isCloud && !isAdmin && <AdminClaim code={tournament.cloud!.code} onClaim={onClaimAdmin} />}
      {isCloud && (
        <button
          type="button"
          className="h-11 w-full rounded-2xl bg-white text-sm font-medium text-slate-600"
          onClick={() => {
            const msg = isAdmin
              ? 'Turnuva silinmez, kodla tekrar katılabilirsin. Ama turnuvayı silme yetkin bu telefondan kalkar. Çıkılsın mı?'
              : 'Turnuvadan çıkılsın mı? Skorlar silinmez, kodla tekrar katılabilirsin.'
            if (window.confirm(msg)) onLeave()
          }}
        >
          Bu telefondan çık
        </button>
      )}
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
        {(pairNames(tournament.names, 'NS', a.ns) ||
          (a.ew !== null && pairNames(tournament.names, nameSide(isHowell(m), 'EW'), a.ew))) && (
          <div className="mt-1 text-sm text-slate-500">
            {pairNames(tournament.names, 'NS', a.ns) || `K-G ${a.ns}`} <span className="text-slate-300">vs</span>{' '}
            {(a.ew !== null && pairNames(tournament.names, nameSide(isHowell(m), 'EW'), a.ew)) || `D-B ${a.ew}`}
          </div>
        )}
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
                  <div className="font-medium">{r.confirmed && <span className="mr-1 text-xs">🔒</span>}{formatResult(r)}</div>
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
//
// Bridgemate mantığı: skor girilir → telefon rakibe verilir, rakip kontrol edip onaylar →
// skor kaydedilir ve kilitlenir (sadece hakem değiştirebilir) → diğer masalar / sonraki board.

type Step = 'enter' | 'confirm' | 'done' | 'others'

function BoardEntry({ tournament, m, round, table, board, isAdmin, back, save, remove, next }: {
  tournament: T
  m: Movement
  round: number
  table: number
  board: number
  isAdmin: boolean
  back: () => void
  save: (entry: ContractEntry) => void
  remove: () => void
  /** Bu masada sıradaki girilmemiş board; yoksa null. */
  next: (() => void) | null
}) {
  const a = m.rounds[round - 1][table - 1]
  const existing = tournament.results[resultKey(board, a.ns)]
  const locked = Boolean(existing?.confirmed) && !isAdmin
  const [entry, setEntry] = useState<ContractEntry>(() => (existing ? resultToEntry(existing) : DEFAULT_ENTRY))
  const [step, setStep] = useState<Step>(locked ? 'done' : 'enter')
  const [justSaved, setJustSaved] = useState(false)

  const nsLabel = `K-G ${a.ns}`
  const ewLabel = `D-B ${a.ew}`
  const header = (
    <Card className="text-center">
      <div className="text-sm text-slate-500">Masa {table} · K-G {a.ns} vs D-B {a.ew}</div>
      <div className="text-3xl font-bold">Board {board}</div>
      <div className="text-xs text-slate-500"><BoardMeta board={board} /></div>
    </Card>
  )
  const nextButton = (
    <button
      type="button"
      className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
      onClick={() => (next ? next() : back())}
    >
      {next ? 'Sonraki boarda geç ›' : 'Masaya dön'}
    </button>
  )

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setStep('enter')}>Düzelt</BackButton>
        {header}
        <Card className="bg-amber-50 text-sm text-amber-900">
          📱 Telefonu <b>rakip çifte</b> verin. Kontrat, oynayan, sonuç ve puan doğruysa onaylasın.
          Onaydan sonra skoru sadece hakem değiştirebilir.
        </Card>
        <ResultSummary board={board} entry={entry} nsScore={entryScore(board, entry)} nsLabel={nsLabel} ewLabel={ewLabel} />
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button
            type="button"
            className="h-14 rounded-2xl border border-slate-300 bg-white font-semibold text-slate-700"
            onClick={() => setStep('enter')}
          >
            Yanlış, düzelt
          </button>
          <button
            type="button"
            className="h-14 rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
            onClick={() => {
              save(entry)
              setJustSaved(true)
              setStep('done')
            }}
          >
            ✓ Onayla
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done' && existing) {
    return (
      <div className="space-y-4">
        <BackButton onClick={back}>Masa {table}</BackButton>
        {header}
        <Card className={`text-center text-sm ${justSaved ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'}`}>
          {justSaved ? '✓ Onaylandı ve kaydedildi.' : '🔒 Bu skor onaylandı.'} Değişiklik gerekirse hakeme söyleyin.
        </Card>
        <ResultSummary board={board} entry={resultToEntry(existing)} nsScore={existing.nsScore} nsLabel={nsLabel} ewLabel={ewLabel} />
        <button
          type="button"
          className="h-14 w-full rounded-2xl border border-emerald-700 bg-white text-lg font-semibold text-emerald-800"
          onClick={() => setStep('others')}
        >
          Diğer masaların sonuçlarını gör
        </button>
        {nextButton}
        {isAdmin && (
          <button type="button" className="h-11 w-full text-sm font-medium text-slate-500" onClick={() => setStep('enter')}>
            Hakem: skoru düzelt
          </button>
        )}
      </div>
    )
  }

  if (step === 'others' || (step === 'done' && !existing)) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setStep('done')}>Board {board}</BackButton>
        <Card className="text-center">
          <div className="text-sm text-slate-500">Bütün masalar</div>
          <div className="text-2xl font-bold">Board {board} sonuçları</div>
        </Card>
        <BoardAllResults m={m} results={tournament.results} board={board} highlightNs={a.ns} />
        {nextButton}
      </div>
    )
  }

  // step === 'enter'
  const adminEdit = isAdmin && Boolean(existing)
  return (
    <div className="space-y-4">
      <BackButton onClick={back}>Masa {table}</BackButton>
      {header}

      <ContractForm value={entry} onChange={setEntry} />
      <ScoreBoxes nsScore={entryScore(board, entry)} />

      {adminEdit ? (
        <>
          <Card className="text-sm text-slate-600">🔑 Hakem düzeltmesi: rakip onayı gerekmeden kaydedilir.</Card>
          <button
            type="button"
            className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
            onClick={() => {
              save(entry)
              back()
            }}
          >
            Düzeltmeyi kaydet
          </button>
          <button
            type="button"
            className="h-12 w-full rounded-2xl border border-red-200 bg-white font-medium text-red-700"
            onClick={() => {
              if (window.confirm(`Board ${board} skoru silinsin mi?`)) remove()
            }}
          >
            Skoru sil
          </button>
        </>
      ) : (
        <button
          type="button"
          className="h-14 w-full rounded-2xl bg-emerald-700 text-lg font-semibold text-white"
          onClick={() => setStep('confirm')}
        >
          Rakibe onaylat ›
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
  | { kind: 'pickTable' }
  | { kind: 'pairs' }
  | { kind: 'editPair'; side: Side; number: number; from: 'round' | 'pairs' }

/** Sunucudan gelen turnuva bilgisinden bu telefondaki turnuva kaydını oluşturur. */
function fromCloud(ct: NonNullable<Awaited<ReturnType<typeof joinTournament>>>, myTable?: number): T {
  return {
    name: ct.name,
    date: ct.date,
    pairCount: ct.pairCount,
    boardsPerRound: ct.boardsPerRound,
    movement: ct.movement ?? undefined,
    createdAt: Date.now(),
    results: {},
    cloud: { id: ct.id, code: ct.code },
    finished: Boolean(ct.finishedAt),
    myTable,
  }
}

/** Masa QR'ı: adres ?kod=ABC234&masa=3 ise o turnuvaya katılıp masayı seç. */
function readTableLink(): { code: string; table: number } | null {
  const q = new URLSearchParams(window.location.search)
  const code = normalizeCode(q.get('kod') ?? '')
  const table = Number(q.get('masa'))
  return isValidCode(code) && Number.isInteger(table) && table >= 1 ? { code, table } : null
}

export default function Tournament() {
  const [tournament, setTournament] = useState<T | null>(() => {
    const t = loadTournament()
    const link = readTableLink()
    // zaten bu turnuvadaysa sadece masayı seç
    if (t && link && t.cloud?.code === link.code) {
      const next = { ...t, myTable: link.table }
      saveTournament(next)
      return next
    }
    return t
  })
  const [round, setRound] = useState(1)
  const [view, setView] = useState<View>({ kind: 'round' })
  const [linkError, setLinkError] = useState<string | null>(null)
  const sync = useCloudSync(tournament, setTournament)

  // Masa QR'ıyla açıldıysa: katıl ve masayı seç (bir kez)
  const linkHandled = useRef(false)
  useEffect(() => {
    if (linkHandled.current) return
    linkHandled.current = true
    const link = readTableLink()
    if (!link || !cloudEnabled) return
    const clearUrl = () => window.history.replaceState(null, '', window.location.pathname)
    const current = loadTournament()
    if (current?.cloud?.code === link.code) {
      clearUrl() // masa yukarıda, ilk açılışta seçildi
      return
    }
    if (current && !window.confirm(`Bu telefon şu an "${current.name}" turnuvasında. Masa ${link.table} için yeni turnuvaya geçilsin mi?`)) {
      clearUrl()
      return
    }
    joinTournament(link.code)
      .then(ct => {
        if (!ct) {
          setLinkError('Bu QR\'daki turnuva bulunamadı. Hakeme sorun.')
          return
        }
        const tables = createMovement(ct.pairCount, ct.boardsPerRound, ct.movement).tables
        const t = fromCloud(ct, ct.finishedAt || link.table > tables ? undefined : link.table)
        saveTournament(t)
        setTournament(t)
        setRound(1)
        setView({ kind: 'round' })
      })
      .catch(e => setLinkError((e as Error).message))
      .finally(clearUrl)
  }, [])

  const m = useMemo(
    () => (tournament ? createMovement(tournament.pairCount, tournament.boardsPerRound, tournament.movement) : null),
    [tournament],
  )

  const replace = (t: T | null, next: View = { kind: 'round' }) => {
    saveTournament(t)
    setTournament(t)
    setRound(1)
    setView(next)
    // paylaşılan linkteki ?kod= kısmını adres çubuğundan temizle
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
  }

  if (!tournament || !m) {
    return (
      <>
        {linkError && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{linkError}</p>}
        <Start
        onCreate={async (input, shared, pin) => {
          const t: T = { ...input, createdAt: Date.now(), results: {} }
          if (shared && cloudEnabled) {
            const adminSecret = newAdminSecret()
            const { id, code } = await createTournament({ ...input, adminSecret, pin })
            t.cloud = { id, code, adminSecret }
          }
          replace(t)
        }}
        onJoin={async code => {
          const ct = await joinTournament(code)
          if (!ct) throw new Error('Bu kodla bir turnuva bulunamadı. Kodu kontrol et.')
          replace(fromCloud(ct), ct.finishedAt ? { kind: 'round' } : { kind: 'pickTable' })
        }}
      />
      </>
    )
  }

  const setMyTable = (table: number | undefined) => {
    setTournament(prev => {
      if (!prev) return prev
      const next = { ...prev, myTable: table }
      saveTournament(next)
      return next
    })
    setView({ kind: 'round' })
  }

  if (tournament.finished) {
    return (
      <Standings
        tournament={tournament}
        m={m}
        back={() => {
          if (window.confirm('Turnuvadan çıkılsın mı? Sonuçlar kulüp arşivinde kalır.')) replace(null)
        }}
        backLabel="Turnuvadan çık"
        banner={
          <Card className="text-sm text-slate-600">
            🏁 Bu turnuva bitirildi, skorlar kilitli. Sonuçlar <b>Arşiv</b> sekmesinde de görünür.
          </Card>
        }
      />
    )
  }

  if (view.kind === 'standings') {
    return <Standings tournament={tournament} m={m} back={() => setView({ kind: 'round' })} />
  }

  if (view.kind === 'pairs') {
    return (
      <PairsView
        m={m}
        names={tournament.names}
        openPair={(side, number) => setView({ kind: 'editPair', side, number, from: 'pairs' })}
        back={() => setView({ kind: 'round' })}
      />
    )
  }

  if (view.kind === 'editPair') {
    const back = () => setView(view.from === 'pairs' ? { kind: 'pairs' } : { kind: 'round' })
    return (
      <PairEditor
        key={`${view.side}-${view.number}`}
        howell={isHowell(m)}
        side={view.side}
        number={view.number}
        names={tournament.names}
        onSave={sync.setPair}
        back={back}
        backLabel={view.from === 'pairs' ? 'Çiftler' : `Masa ${tournament.myTable ?? ''}`.trim()}
      />
    )
  }

  if (view.kind === 'pickTable') {
    return <TablePicker tournament={tournament} m={m} onPick={t => setMyTable(t)} onAll={() => setMyTable(undefined)} />
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
    const backToTable = () => setView(tournament.myTable ? { kind: 'round' } : { kind: 'table', table: view.table })
    // sıradaki girilmemiş board (önce bundan sonrakiler, sonra öncekiler)
    const after = a.boards.filter(b => b > view.board)
    const before = a.boards.filter(b => b < view.board)
    const nextBoard = [...after, ...before].find(b => !tournament.results[resultKey(b, a.ns)])
    return (
      <BoardEntry
        key={key}
        tournament={tournament}
        m={m}
        round={round}
        table={view.table}
        board={view.board}
        isAdmin={!tournament.cloud || Boolean(tournament.cloud.adminSecret)}
        back={backToTable}
        save={entry => sync.setResult(view.board, a.ns, makeResult(a, round, view.board, entry))}
        remove={() => {
          sync.setResult(view.board, a.ns, null)
          backToTable()
        }}
        next={nextBoard === undefined ? null : () => setView({ kind: 'board', table: view.table, board: nextBoard })}
      />
    )
  }

  if (tournament.myTable && tournament.myTable <= m.tables) {
    const table = tournament.myTable
    return (
      <MyTableView
        tournament={tournament}
        m={m}
        table={table}
        openBoard={(r, board) => {
          setRound(r)
          setView({ kind: 'board', table, board })
        }}
        openStandings={() => setView({ kind: 'standings' })}
        onChangeTable={() => setView({ kind: 'pickTable' })}
        onShowAll={() => setMyTable(undefined)}
        onEditPair={(side, number) => setView({ kind: 'editPair', side, number, from: 'round' })}
        onLeave={() => replace(null)}
        codeBox={
          tournament.cloud && (
            <Card className="pt-1">
              <CodeBox tournament={tournament} status={sync.status} pendingCount={sync.pendingCount} />
            </Card>
          )
        }
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
      openPicker={() => setView({ kind: 'pickTable' })}
      openPairs={() => setView({ kind: 'pairs' })}
      onLeave={() => replace(null)}
      onDelete={async () => {
        const c = tournament.cloud
        if (!c?.adminSecret) return
        try {
          const ok = await deleteTournament(c.id, c.adminSecret)
          if (!ok) window.alert('Turnuva sunucuda bulunamadı ya da zaten silinmiş.')
          replace(null)
        } catch (e) {
          window.alert((e as Error).message)
        }
      }}
      onFinish={async () => {
        const c = tournament.cloud
        if (!c?.adminSecret) return
        try {
          const ok = await finishTournament(c.id, c.adminSecret)
          if (!ok) {
            window.alert('Turnuva bitirilemedi: yönetici yetkisi doğrulanamadı.')
            return
          }
          setTournament(prev => {
            if (!prev) return prev
            const next = { ...prev, finished: true }
            saveTournament(next)
            return next
          })
        } catch (e) {
          window.alert((e as Error).message)
        }
      }}
      onClaimAdmin={pin => {
        // Hakem şifresi bu telefonda yönetici anahtarı olarak saklanır (sunucu şifreyle silmeye izin verir)
        setTournament(prev => {
          if (!prev?.cloud) return prev
          const next = { ...prev, cloud: { ...prev.cloud, adminSecret: pin } }
          saveTournament(next)
          return next
        })
      }}
      status={sync.status}
      pendingCount={sync.pendingCount}
    />
  )
}
