import { useState } from 'react'
import { DEFAULT_ENTRY, entryScore } from '../tournament/results'
import ContractForm from './ContractForm'
import { Card, ScoreBoxes } from './ui'

export default function Calculator() {
  const [entry, setEntry] = useState(DEFAULT_ENTRY)

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-lg font-bold">Skor hesaplayıcı</div>
        <div className="text-xs text-slate-500">Kontratı, deklaranı, yeşil/kırmızıyı ve sonucu seç</div>
      </Card>

      <ContractForm value={entry} onChange={setEntry} />
      <ScoreBoxes nsScore={entryScore(entry)} />
    </div>
  )
}
