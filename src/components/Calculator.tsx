import { useState } from 'react'
import { DEFAULT_ENTRY, entryScore } from '../tournament/results'
import { BoardMeta } from './BoardHeader'
import ContractForm from './ContractForm'
import { Card, ScoreBoxes } from './ui'

export default function Calculator() {
  const [board, setBoard] = useState(1)
  const [entry, setEntry] = useState(DEFAULT_ENTRY)

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="mb-1 text-sm text-slate-500">Board</div>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Önceki board"
            onClick={() => setBoard(b => Math.max(1, b - 1))}
            className="h-11 w-11 rounded-full bg-slate-100 text-2xl"
          >
            −
          </button>
          <div className="w-16 text-4xl font-bold">{board}</div>
          <button
            type="button"
            aria-label="Sonraki board"
            onClick={() => setBoard(b => Math.min(40, b + 1))}
            className="h-11 w-11 rounded-full bg-slate-100 text-2xl"
          >
            +
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <BoardMeta board={board} />
        </div>
      </Card>

      <ContractForm value={entry} onChange={setEntry} />
      <ScoreBoxes nsScore={entryScore(board, entry)} />
    </div>
  )
}
