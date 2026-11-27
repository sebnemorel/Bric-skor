// Tur süresi: hakemin ayarladığı geri sayım. Sunucuda saklanır, herkes canlı görür.

export interface TimerState {
  round: number
  roundMinutes: number
  /** çalışıyorsa bitiş anı (ms, sunucu saatine göre düzeltilmiş) */
  endsAt: number | null
  /** durdurulmuşsa kalan saniye */
  remainingSec: number | null
}

/** Sunucuya gönderilecek ayar: süre şimdi başlar (running) ya da durur. */
export interface TimerCommand {
  round: number
  minutes: number
  running: boolean
  seconds: number
}

export const isRunning = (t: TimerState) => t.endsAt !== null

/** Kalan saniye (bittiyse 0 ya da eksi). */
export function remainingSec(t: TimerState, now: number): number {
  if (t.endsAt !== null) return Math.ceil((t.endsAt - now) / 1000)
  return t.remainingSec ?? t.roundMinutes * 60
}

/** 754 → "12:34", 3725 → "1:02:05", bitti → "0:00" */
export function formatClock(sec: number): string {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`
}

/** Renk: yeşil, son 2 dakika sarı, bitti kırmızı. */
export function urgency(sec: number): 'ok' | 'warn' | 'over' {
  if (sec <= 0) return 'over'
  if (sec <= 120) return 'warn'
  return 'ok'
}

export const startRound = (round: number, minutes: number): TimerCommand => ({
  round,
  minutes,
  running: true,
  seconds: minutes * 60,
})

export const pause = (t: TimerState, now: number): TimerCommand => ({
  round: t.round,
  minutes: t.roundMinutes,
  running: false,
  seconds: Math.max(0, remainingSec(t, now)),
})

export const resume = (t: TimerState, now: number): TimerCommand => ({
  round: t.round,
  minutes: t.roundMinutes,
  running: true,
  seconds: Math.max(0, remainingSec(t, now)),
})

/** Süreye dakika ekle/çıkar (çalışma durumu değişmez). */
export const addMinutes = (t: TimerState, now: number, minutes: number): TimerCommand => ({
  round: t.round,
  minutes: t.roundMinutes,
  running: isRunning(t),
  seconds: Math.max(0, remainingSec(t, now) + minutes * 60),
})

/** Sunucu satırından (realtime ya da get_timer) duruma çevirir; offset = sunucu saati - telefon saati. */
export function fromServer(
  row: { round: number; roundMinutes: number; endsAt: string | null; remainingSec: number | null },
  offsetMs: number,
): TimerState {
  return {
    round: row.round,
    roundMinutes: row.roundMinutes,
    endsAt: row.endsAt ? Date.parse(row.endsAt) - offsetMs : null,
    remainingSec: row.remainingSec,
  }
}
