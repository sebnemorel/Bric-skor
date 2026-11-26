// Kontrat, deklaran ve sonucu seçme formu. Hesaplayıcı ve turnuva skor girişi bunu kullanır.
import type { Contract, Seat, Strain } from '../scoring/score'
import type { ContractEntry } from '../tournament/results'
import { Card, Chip, RoundButton } from './ui'

const STRAINS: { value: Strain; label: string; color: string }[] = [
  { value: 'C', label: '♣', color: 'text-slate-900' },
  { value: 'D', label: '♦', color: 'text-red-600' },
  { value: 'H', label: '♥', color: 'text-red-600' },
  { value: 'S', label: '♠', color: 'text-slate-900' },
  { value: 'NT', label: 'NT', color: 'text-slate-900' },
]
const SEATS: { value: Seat; label: string }[] = [
  { value: 'N', label: 'Kuzey' },
  { value: 'E', label: 'Doğu' },
  { value: 'S', label: 'Güney' },
  { value: 'W', label: 'Batı' },
]

export default function ContractForm({ value, onChange }: {
  value: ContractEntry
  onChange: (v: ContractEntry) => void
}) {
  const { passed, contract, declarer, result } = value
  const set = (patch: Partial<ContractEntry>) => onChange({ ...value, ...patch })
  const setContract = (patch: Partial<Contract>) => {
    const c = { ...contract, ...patch }
    // seviye değişince sonucu geçerli aralıkta tut
    const r = Math.min(Math.max(result, -(c.level + 6)), 7 - c.level)
    onChange({ ...value, passed: false, contract: c, result: r })
  }

  const tricks = contract.level + 6 + result

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">Kontrat</div>
          <button
            type="button"
            onClick={() => set({ passed: !passed })}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              passed ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Dört pas
          </button>
        </div>
        <div className={passed ? 'pointer-events-none space-y-3 opacity-30' : 'space-y-3'}>
          <div className="grid grid-cols-7 gap-1.5">
            {([1, 2, 3, 4, 5, 6, 7] as const).map(l => (
              <Chip key={l} active={!passed && contract.level === l} onClick={() => setContract({ level: l })}>
                {l}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STRAINS.map(s => (
              <Chip
                key={s.value}
                active={!passed && contract.strain === s.value}
                onClick={() => setContract({ strain: s.value })}
                className={s.color}
              >
                {s.label}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Chip active={!passed && contract.doubling === ''} onClick={() => setContract({ doubling: '' })}>—</Chip>
            <Chip active={!passed && contract.doubling === 'X'} onClick={() => setContract({ doubling: 'X' })}>X</Chip>
            <Chip active={!passed && contract.doubling === 'XX'} onClick={() => setContract({ doubling: 'XX' })}>XX</Chip>
          </div>
        </div>
      </Card>

      {!passed && (
        <>
          <Card className="space-y-3">
            <div className="text-sm font-medium text-slate-500">Deklaran</div>
            <div className="grid grid-cols-4 gap-1.5">
              {SEATS.map(s => (
                <Chip key={s.value} active={declarer === s.value} onClick={() => set({ declarer: s.value })} className="text-base">
                  {s.label}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium text-slate-500">Deklaran tarafı</div>
              <div className="text-xs text-slate-400">Seçilmezse yeşil sayılır</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => set({ vul: value.vul === false ? null : false })}
                className={`h-12 rounded-xl text-base font-semibold ${
                  value.vul === false ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                Yeşil
              </button>
              <button
                type="button"
                onClick={() => set({ vul: value.vul === true ? null : true })}
                className={`h-12 rounded-xl text-base font-semibold ${
                  value.vul === true ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'
                }`}
              >
                Kırmızı
              </button>
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-sm font-medium text-slate-500">Sonuç</div>
            <div className="flex items-center justify-between">
              <RoundButton size="lg" disabled={result <= -(contract.level + 6)} onClick={() => set({ result: result - 1 })}>−</RoundButton>
              <div className="text-center">
                <div className="text-3xl font-bold">{result === 0 ? '=' : result > 0 ? `+${result}` : result}</div>
                <div className="text-xs text-slate-500">{tricks} levée</div>
              </div>
              <RoundButton size="lg" disabled={result >= 7 - contract.level} onClick={() => set({ result: result + 1 })}>+</RoundButton>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
