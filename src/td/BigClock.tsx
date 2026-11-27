// Büyük ekran: salondaki ekrana/projeksiyona yansıtılan tur süresi.
import { useEffect } from 'react'
import { formatClock, isRunning, remainingSec, urgency, type TimerState } from '../timer/timer'

const COLOR = { ok: 'text-white', warn: 'text-amber-300', over: 'text-red-500' } as const

export default function BigClock({ name, timer, now, rounds, onClose }: {
  name: string
  timer: TimerState | null
  now: number
  rounds: number
  onClose: () => void
}) {
  useEffect(() => {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {})
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [onClose])

  const sec = timer ? remainingSec(timer, now) : 0
  const u = urgency(sec)
  const running = timer ? isRunning(timer) : false
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none">
      <div className="absolute top-6 text-[3vw] font-semibold text-slate-400">{name}</div>
      {timer ? (
        <>
          <div className="text-[5vw] font-bold text-slate-300">
            Tur {timer.round}
            {rounds > 1 && <span className="text-slate-500"> / {rounds}</span>}
          </div>
          <div className={`font-mono text-[24vw] leading-none font-black tabular-nums ${running ? COLOR[u] : 'text-slate-500'}`}>
            {formatClock(sec)}
          </div>
          <div className="mt-4 h-[5vw] text-[3.5vw] font-semibold">
            {!running ? <span className="text-slate-400">⏸ Durduruldu</span> : u === 'over' ? <span className="text-red-500">Süre doldu</span> : null}
          </div>
        </>
      ) : (
        <div className="text-[5vw] text-slate-400">Süre henüz başlatılmadı</div>
      )}
      <button type="button" onClick={onClose} className="absolute right-6 bottom-6 rounded-full bg-white/10 px-5 py-2 text-sm text-slate-300">
        Kapat (Esc)
      </button>
    </div>
  )
}
