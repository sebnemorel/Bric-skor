// Masa telefonlarında kalan tur süresi (hakem ayarladıysa görünür).
import { formatClock, isRunning, remainingSec, urgency } from './timer'
import { useTimer } from './useTimer'

const COLORS = {
  ok: 'bg-emerald-700 text-white',
  warn: 'bg-amber-400 text-amber-950',
  over: 'bg-red-600 text-white',
} as const

export default function TimerBar({ tournamentId }: { tournamentId: string }) {
  const { timer, now } = useTimer(tournamentId)
  if (!timer) return null
  const sec = remainingSec(timer, now)
  const u = urgency(sec)
  const running = isRunning(timer)
  return (
    <div
      role="timer"
      aria-label={`Tur ${timer.round} kalan süre`}
      className={`mt-3 flex items-center justify-between rounded-xl px-4 py-2 ${running ? COLORS[u] : 'bg-slate-200 text-slate-700'}`}
    >
      <span className="text-sm font-medium">
        {running ? '⏱' : '⏸'} Tur {timer.round}
        {!running && ' · durduruldu'}
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums">{u === 'over' && running ? 'Süre doldu' : formatClock(sec)}</span>
    </div>
  )
}
