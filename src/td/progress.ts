import type { Movement } from '../tournament/movement'
import { resultKey, type Results } from '../tournament/results'

/** Toplam/girilen skor sayısı (karşı çifti olmayan masalar hariç). */
export function progressCount(m: Movement, results: Results) {
  let total = 0
  let done = 0
  for (const tables of m.rounds)
    for (const a of tables) {
      if (a.ew === null) continue
      total += a.boards.length
      done += a.boards.filter(b => results[resultKey(b, a.ns)]).length
    }
  return { done, total }
}
