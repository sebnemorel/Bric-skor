import { describe, expect, it } from 'vitest'
import { createMovement } from '../tournament/movement'
import { DEFAULT_ENTRY, makeResult, resultKey, type Results } from '../tournament/results'
import { progressCount } from './progress'

describe('girilen skor sayısı', () => {
  it('sabit masalar: masa × board', () => {
    const m = createMovement(8, 12, 'stationary') // 4 masa × 12 board
    const results: Results = {}
    const a = m.rounds[0][0]
    results[resultKey(1, a.ns)] = makeResult(a, 1, 1, DEFAULT_ENTRY)
    expect(progressCount(m, results)).toEqual({ done: 1, total: 48 })
  })

  it('tek sayılı Mitchell: boş masa sayılmaz', () => {
    const m = createMovement(9, 2, 'mitchell') // 5 masa, her turda bir masa boş
    const { total } = progressCount(m, {})
    expect(total).toBe(m.rounds.length * 4 * 2)
  })
})
