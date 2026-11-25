// Birden fazla ekranda kullanılan küçük parçalar.

export function Chip({ active, onClick, children, className = '' }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl border text-lg font-semibold transition ${
        active ? 'border-emerald-700 bg-emerald-700 !text-white' : 'border-slate-300 bg-white hover:bg-slate-50'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function RoundButton({ onClick, disabled, children, size = 'md' }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  size?: 'md' | 'lg'
}) {
  const s = size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-xl'
  return (
    <button
      type="button"
      className={`${s} rounded-full bg-slate-100 disabled:opacity-30`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</section>
}

export function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 text-sm font-medium text-emerald-800">
      ‹ {children}
    </button>
  )
}

/** K-G / D-B skor kutuları. */
export function ScoreBoxes({ nsScore }: { nsScore: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-emerald-700 p-4 text-center text-white">
        <div className="text-sm opacity-80">K-G</div>
        <div className="h-9 text-3xl font-bold">{nsScore > 0 ? nsScore : ''}</div>
      </div>
      <div className="rounded-2xl bg-slate-800 p-4 text-center text-white">
        <div className="text-sm opacity-80">D-B</div>
        <div className="h-9 text-3xl font-bold">{nsScore < 0 ? -nsScore : ''}</div>
      </div>
    </div>
  )
}
