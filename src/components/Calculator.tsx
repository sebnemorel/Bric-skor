import { useState } from 'react'
import { DEFAULT_ENTRY, entryScore } from '../tournament/results'
import { BoardMeta } from './BoardHeader'
import ContractForm from './ContractForm'
import { Card, RoundButton, ScoreBoxes } from './ui'

export default function Calculator() {
  const [board, setBoard] = useState(1)
  const [entry, setEntry] = useState(DEFAULT_ENTRY)

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <RoundButton onClick={() => setBoard(b => Math.max(1, b - 1))}>−</RoundButton>
        <div className="text-center">
          <div className="text-sm text-slate-500">Board</div>
          <div className="text-3xl font-bold">{board}</div>
          <div className="text-xs text-slate-500"><BoardMeta board={board} /></div>
        </div>
        <RoundButton onClick={() => setBoard(b => b + 1)}>+</RoundButton>
      </Card>

      <ContractForm value={entry} onChange={setEntry} />
      <ScoreBoxes nsScore={entryScore(board, entry)} />
    </div>
  )
}
