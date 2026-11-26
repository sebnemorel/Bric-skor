import { useState } from 'react'
import { cloudEnabled } from './cloud/api'
import Archive from './components/Archive'
import Calculator from './components/Calculator'
import Tournament from './components/Tournament'
import InstallBanner from './install/InstallBanner'
import UpdatePrompt from './install/UpdatePrompt'

type Tab = 'tournament' | 'archive' | 'calculator'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tournament', label: 'Turnuva' },
  ...(cloudEnabled ? [{ id: 'archive' as const, label: 'Arşiv' }] : []),
  { id: 'calculator', label: 'Hesaplayıcı' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('tournament')

  return (
    <main className="mx-auto min-h-screen max-w-md bg-emerald-50 p-4 text-slate-900">
      <h1 className="mb-3 text-center text-2xl font-bold">Briç Skor Akdeniz</h1>

      <InstallBanner />

      <nav
        className="mb-4 grid gap-1 rounded-2xl bg-white p-1 shadow-sm"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-xl font-medium transition ${
              tab === t.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'tournament' ? <Tournament /> : tab === 'archive' ? <Archive /> : <Calculator />}

      <p className="mt-8 pb-4 text-center text-xs text-slate-400">Sürüm: {__BUILD_TIME__}</p>

      <UpdatePrompt />
    </main>
  )
}
