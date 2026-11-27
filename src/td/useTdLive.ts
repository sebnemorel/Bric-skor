// Hakem ekranı için turnuvanın skorlarını ve isimlerini canlı izler.
import { useEffect, useState } from 'react'
import { fetchPairs, fetchResults, subscribeResults } from '../cloud/api'
import { applyRemoteChange } from '../cloud/sync'
import type { PairNames } from '../tournament/pairs'
import type { Results } from '../tournament/results'

export function useTdLive(tournamentId: string) {
  const [results, setResults] = useState<Results>({})
  const [names, setNames] = useState<PairNames>({})
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      Promise.all([fetchResults(tournamentId), fetchPairs(tournamentId)])
        .then(([r, n]) => {
          if (cancelled) return
          setResults(r)
          setNames(n)
          setError(null)
        })
        .catch(e => !cancelled && setError((e as Error).message))
    void load()
    const stop = subscribeResults(
      tournamentId,
      change => setResults(prev => applyRemoteChange(prev, {}, change)),
      connected => {
        setLive(connected)
        if (connected) void load() // bağlantı (yeniden) kurulunca kaçırılanları çek
      },
      ({ key, info }) => setNames(prev => ({ ...prev, [key]: info })),
    )
    return () => {
      cancelled = true
      stop()
    }
  }, [tournamentId])

  return { results, setResults, names, live, error }
}
