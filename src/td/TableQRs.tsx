// Hakem paneli · Masa QR'ları: her masa telefonu kendi QR'ını okutunca doğrudan
// bu turnuvaya ve o masaya bağlanır. Yazdırılabilir (A4'e 6 masa).
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { createMovement, isHowell } from '../tournament/movement'
import { pairLabel, pairNames, nameSide, type PairNames } from '../tournament/pairs'
import { tableLink, type TdTournament } from './tdStorage'

export default function TableQRs({ t, names }: { t: TdTournament; names: PairNames }) {
  const m = createMovement(t.pairCount, t.boardsPerRound, t.movement)
  const howell = isHowell(m)
  const [qrs, setQrs] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(
      Array.from({ length: m.tables }, (_, i) =>
        QRCode.toDataURL(tableLink(t.code, i + 1), { width: 360, margin: 1, color: { dark: '#1e2f6b', light: '#ffffff' } }),
      ),
    ).then(list => {
      if (!cancelled) setQrs(Object.fromEntries(list.map((src, i) => [i + 1, src])))
    })
    return () => {
      cancelled = true
    }
  }, [t.code, m.tables])

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
      {m.rounds[0].map(a => {
        const ns = pairNames(names, nameSide(howell, 'NS'), a.ns)
        const ew = a.ew !== null ? pairNames(names, nameSide(howell, 'EW'), a.ew) : ''
        return (
          <article
            key={a.table}
            className="break-inside-avoid rounded-2xl border-2 border-slate-200 bg-white p-4 text-center print:rounded-none print:border"
          >
            <div className="text-xs text-slate-500">{t.name} · {t.date}</div>
            <div className="text-4xl font-black">Masa {a.table}</div>
            {qrs[a.table] ? (
              <img src={qrs[a.table]} alt={`Masa ${a.table} QR kodu`} className="mx-auto my-2 w-40 print:w-36" />
            ) : (
              <div className="mx-auto my-2 h-40 w-40" />
            )}
            <div className="text-xs text-slate-600">
              <div>
                <b>{pairLabel(howell, 'NS', a.ns)}</b> {ns || '—'}
              </div>
              {a.ew !== null && (
                <div>
                  <b>{pairLabel(howell, 'EW', a.ew)}</b> {ew || '—'}
                </div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Telefon kamerasıyla okut · kod <span className="font-mono font-bold text-slate-600">{t.code}</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
