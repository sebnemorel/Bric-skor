import { useState } from 'react'
import Calculator from './components/Calculator'
import Tournament from './components/Tournament'
import InstallBanner from './install/InstallBanner'
import UpdatePrompt from './install/UpdatePrompt'

type Tab = 'tournament' | 'calculator'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tournament', label: 'Turnuva' },
  { id: 'calculator', label: 'Hesaplayıcı' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('tournament')

  return (
    <main className="mx-auto min-h-screen max-w-md bg-emerald-50 p-4 text-slate-900">
      <h1 className="mb-3 text-center text-2xl font-bold">Briç Skor Akdeniz</h1>

      <InstallBanner />

      <nav className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm">
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

      {tab === 'tournament' ? <Tournament /> : <Calculator />}

      <UpdatePrompt />
    </main>
  )
}
