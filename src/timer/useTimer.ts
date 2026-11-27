// Bir turnuvanın tur süresini canlı izler; her saniye yeniden çizer.
import { useEffect, useRef, useState } from 'react'
import { cloudEnabled, getTimer, subscribeTimer } from '../cloud/api'
import { fromServer, type TimerState } from './timer'

export function useTimer(tournamentId: string | undefined) {
  const [timer, setTimerState] = useState<TimerState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const offset = useRef(0) // sunucu saati - bu cihazın saati

  useEffect(() => {
    if (!tournamentId || !cloudEnabled) return
    let cancelled = false
    const load = () =>
      getTimer(tournamentId)
        .then(r => {
          if (cancelled) return
          offset.current = Date.parse(r.now) - Date.now()
          setTimerState(r.timer ? fromServer(r.timer, offset.current) : null)
        })
        .catch(() => {
          // süre özelliği sunucuda yoksa (eski SQL) sessizce gösterme
        })
    void load()
    const stop = subscribeTimer(tournamentId, row => setTimerState(fromServer(row, offset.current)))
    // telefon uykudan uyanınca yeniden çek (canlı bağlantı kopmuş olabilir)
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tournamentId])

  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [timer])

  return { timer, now, setLocal: setTimerState }
}
