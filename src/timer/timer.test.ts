import { describe, expect, it } from 'vitest'
import { addMinutes, formatClock, fromServer, pause, remainingSec, resume, startRound, urgency, type TimerState } from './timer'

const running: TimerState = { round: 2, roundMinutes: 20, endsAt: 1_000_000 + 754_000, remainingSec: null }
const paused: TimerState = { round: 2, roundMinutes: 20, endsAt: null, remainingSec: 300 }

describe('tur süresi', () => {
  it('kalan süre', () => {
    expect(remainingSec(running, 1_000_000)).toBe(754)
    expect(remainingSec(paused, 9e12)).toBe(300)
    expect(remainingSec({ ...paused, remainingSec: null }, 0)).toBe(1200) // başlamamış: tam tur
  })

  it('saat yazımı', () => {
    expect(formatClock(754)).toBe('12:34')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-10)).toBe('0:00')
  })

  it('renk', () => {
    expect(urgency(500)).toBe('ok')
    expect(urgency(90)).toBe('warn')
    expect(urgency(0)).toBe('over')
  })

  it('komutlar', () => {
    expect(startRound(3, 25)).toEqual({ round: 3, minutes: 25, running: true, seconds: 1500 })
    expect(pause(running, 1_000_000)).toEqual({ round: 2, minutes: 20, running: false, seconds: 754 })
    expect(resume(paused, 0)).toEqual({ round: 2, minutes: 20, running: true, seconds: 300 })
    expect(addMinutes(running, 1_000_000, 1).seconds).toBe(814)
    expect(addMinutes(paused, 0, -10).seconds).toBe(0)
  })

  it('sunucu saati farkı düzeltilir', () => {
    // sunucu telefondan 5 sn ileride: bitiş anı telefona göre 5 sn önce
    const t = fromServer({ round: 1, roundMinutes: 20, endsAt: '2026-11-27T12:00:00Z', remainingSec: null }, 5000)
    expect(t.endsAt).toBe(Date.parse('2026-11-27T12:00:00Z') - 5000)
  })
})
