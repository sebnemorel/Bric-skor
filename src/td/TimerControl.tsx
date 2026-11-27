// Hakem ekranı · tur süresi: ayarla, başlat, durdur, süre ekle, sonraki tur, büyük ekran.
import { useState } from 'react'
import { setTimer } from '../cloud/api'
import {
  addMinutes,
  formatClock,
  isRunning,
  pause,
  remainingSec,
  resume,
  startRound,
  urgency,
  type TimerCommand,
  type TimerState,
} from '../timer/timer'
import BigClock from './BigClock'
import type { TdTournament } from './tdStorage'

const CLOCK = { ok: 'text-slate-900', warn: 'text-amber-600', over: 'text-red-600' } as const

export default function TimerControl({ td, rounds, suggestedMinutes, disabled, timer, now, setLocal }: {
  td: TdTournament
  rounds: number
  suggestedMinutes: number
  disabled: boolean
  timer: TimerState | null
  now: number
  setLocal: (t: TimerState | null) => void
}) {
  const [round, setRound] = useState<number | null>(null) // null: süredeki turu kullan
  const [minutes, setMinutes] = useState<number | null>(null)
  const [big, setBig] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const r = round ?? timer?.round ?? 1
  const min = minutes ?? timer?.roundMinutes ?? suggestedMinutes
  const sec = timer ? remainingSec(timer, now) : min * 60
  const running = timer ? isRunning(timer) : false
  const started = timer !== null

  const send = async (c: TimerCommand) => {
    setError(null)
    const before = timer
    // hemen göster, sunucu onaylayınca canlı güncelleme de gelir
    setLocal({ round: c.round, roundMinutes: c.minutes, endsAt: c.running ? Date.now() + c.seconds * 1000 : null, remainingSec: c.running ? null : c.seconds })
    setRound(null)
    try {
      if (!(await setTimer(td.id, td.adminSecret, c))) throw new Error('Süre ayarlanamadı: turnuva bitmiş ya da yetki yok.')
    } catch (e) {
      setLocal(before)
      setError((e as Error).message)
    }
  }

  const btn = 'h-11 rounded-xl px-4 font-semibold disabled:opacity-40'
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {big && <BigClock name={td.name} timer={timer} now={now} rounds={rounds} onClose={() => setBig(false)} />}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="text-sm text-slate-500">
            {started ? `Tur ${timer!.round}${rounds > 1 ? ` / ${rounds}` : ''}` : 'Tur süresi'}
            {started && !running && ' · durduruldu'}
          </div>
          <div className={`font-mono text-6xl font-black tabular-nums ${running ? CLOCK[urgency(sec)] : 'text-slate-400'}`}>
            {formatClock(sec)}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {rounds > 1 && (
            <label className="block">
              <span className="text-xs text-slate-500">Tur</span>
              <select
                className="mt-1 block h-11 rounded-xl border border-slate-300 px-2"
                value={r}
                disabled={disabled}
                onChange={e => setRound(Number(e.target.value))}
              >
                {Array.from({ length: rounds }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}. tur
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-xs text-slate-500">Süre (dk)</span>
            <input
              type="number"
              min={1}
              max={240}
              className="mt-1 block h-11 w-20 rounded-xl border border-slate-300 px-2 text-center"
              value={min}
              disabled={disabled}
              onChange={e => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
            />
          </label>
          <button
            type="button"
            disabled={disabled}
            className={`${btn} bg-emerald-700 text-white`}
            onClick={() => void send(startRound(r, min))}
          >
            ▶ {started && r === timer!.round ? 'Turu baştan başlat' : `${r}. turu başlat`}
          </button>
        </div>

        {started && (
          <div className="flex flex-wrap gap-2">
            {running ? (
              <button type="button" disabled={disabled} className={`${btn} bg-slate-800 text-white`} onClick={() => void send(pause(timer!, Date.now()))}>
                ⏸ Durdur
              </button>
            ) : (
              <button type="button" disabled={disabled} className={`${btn} bg-slate-800 text-white`} onClick={() => void send(resume(timer!, Date.now()))}>
                ▶ Devam
              </button>
            )}
            <button type="button" disabled={disabled} className={`${btn} bg-slate-100`} onClick={() => void send(addMinutes(timer!, Date.now(), 1))}>
              +1 dk
            </button>
            <button type="button" disabled={disabled} className={`${btn} bg-slate-100`} onClick={() => void send(addMinutes(timer!, Date.now(), -1))}>
              −1 dk
            </button>
            {timer!.round < rounds && (
              <button
                type="button"
                disabled={disabled}
                className={`${btn} bg-emerald-50 text-emerald-800`}
                onClick={() => void send(startRound(timer!.round + 1, min))}
              >
                ⏭ {timer!.round + 1}. turu başlat
              </button>
            )}
          </div>
        )}

        <button type="button" className={`${btn} ml-auto border border-slate-300 bg-white`} onClick={() => setBig(true)}>
          📺 Büyük ekran
        </button>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Kalan süre masa telefonlarında da görünür.</p>
    </section>
  )
}
