// Bulut turnuvasını canlı tutan React kancası.
//
// Akış:
//  1. Açılışta sunucudaki tüm skorlar çekilir, henüz gönderilmemiş yerel değişikliklerle birleştirilir.
//  2. Başka telefonların girdiği skorlar canlı olarak gelir (Supabase Realtime).
//  3. Bu telefonda girilen skor önce yerelde kaydedilir ("bekleyen"), sonra sunucuya gönderilir.
//     İnternet yoksa bekler; bağlantı gelince kendiliğinden gönderilir.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { resultKey, type BoardResult } from '../tournament/results'
import { saveTournament, type Tournament } from '../tournament/storage'
import { cloudEnabled, deleteResult, fetchResults, subscribeResults, upsertResult } from './api'
import { applyRemoteChange, mergeResults } from './sync'

export type SyncStatus = 'local' | 'connecting' | 'live' | 'offline'

type Setter = (fn: (prev: Tournament | null) => Tournament | null) => void

export function useCloudSync(tournament: Tournament | null, setTournament: Setter) {
  const [connected, setConnected] = useState(false)
  const [reachable, setReachable] = useState(true)
  const ref = useRef(tournament)
  useLayoutEffect(() => {
    ref.current = tournament
  })
  const flushing = useRef(false)

  const cloudId = cloudEnabled ? tournament?.cloud?.id : undefined
  const pendingCount = Object.keys(tournament?.pending ?? {}).length

  /** Kaydedip state'i güncelleyen yardımcı. */
  const modify = useCallback(
    (fn: (prev: Tournament) => Tournament) =>
      setTournament(prev => {
        if (!prev) return prev
        const next = fn(prev)
        if (next !== prev) saveTournament(next)
        return next
      }),
    [setTournament],
  )

  /** Tek bir değişikliği sunucuya gönderir; başarılıysa bekleyenlerden çıkarır. */
  const send = useCallback(
    async (cloudId: string, key: string, value: BoardResult | null): Promise<boolean> => {
      try {
        if (value) {
          await upsertResult(cloudId, value)
        } else {
          const [board, ns] = key.split('-').map(Number)
          await deleteResult(cloudId, board, ns)
        }
        // bu arada aynı skor tekrar değişmediyse bekleyenlerden çıkar
        modify(prev => {
          if (!prev.pending || prev.pending[key] !== value) return prev
          const pending = { ...prev.pending }
          delete pending[key]
          return { ...prev, pending }
        })
        setReachable(true)
        return true
      } catch {
        setReachable(false)
        return false
      }
    },
    [modify],
  )

  /** Bekleyen tüm değişiklikleri sırayla göndermeyi dener. */
  const flush = useCallback(async () => {
    if (flushing.current) return
    const t = ref.current
    if (!t?.cloud || !t.pending) return
    flushing.current = true
    try {
      for (const [key, value] of Object.entries(t.pending)) {
        if (!(await send(t.cloud.id, key, value))) break // bağlantı yoksa diğerlerini deneme
      }
    } finally {
      flushing.current = false
    }
  }, [send])

  // 1) İlk yükleme + 2) canlı dinleme
  useEffect(() => {
    if (!cloudId) return
    let cancelled = false

    fetchResults(cloudId)
      .then(server => {
        if (cancelled) return
        modify(prev => ({ ...prev, results: mergeResults(server, prev.pending ?? {}) }))
        setReachable(true)
        void flush()
      })
      .catch(() => !cancelled && setReachable(false))

    const unsubscribe = subscribeResults(
      cloudId,
      change => modify(prev => ({ ...prev, results: applyRemoteChange(prev.results, prev.pending ?? {}, change) })),
      ok => {
        setConnected(ok)
        if (ok) void flush()
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
      setConnected(false)
    }
  }, [cloudId, modify, flush])

  // 3) İnternet geri gelince ve belirli aralıklarla tekrar dene
  useEffect(() => {
    if (!cloudId) return
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)
    const timer = pendingCount > 0 ? window.setInterval(() => void flush(), 15000) : undefined
    return () => {
      window.removeEventListener('online', onOnline)
      if (timer) window.clearInterval(timer)
    }
  }, [cloudId, pendingCount, flush])

  /** Bu telefonda bir skor kaydet ya da sil (null). */
  const setResult = useCallback(
    (board: number, ns: number, result: BoardResult | null) => {
      const key = resultKey(board, ns)
      modify(prev => {
        const results = { ...prev.results }
        if (result) results[key] = result
        else delete results[key]
        if (!prev.cloud) return { ...prev, results }
        return { ...prev, results, pending: { ...(prev.pending ?? {}), [key]: result } }
      })
      const cloudId = ref.current?.cloud?.id
      if (cloudEnabled && cloudId) void send(cloudId, key, result)
    },
    [modify, send],
  )

  const status: SyncStatus = !cloudId ? 'local' : !reachable ? 'offline' : connected ? 'live' : 'connecting'

  return { status, pendingCount, setResult }
}
