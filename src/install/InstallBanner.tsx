// "Telefona kur" banner'ı ve talimat penceresi.
//
// - Tarayıcı kendi yükleme penceresini destekliyorsa (Chrome, Edge): tek dokunuşla kurar.
// - Desteklemiyorsa: o tarayıcıya özel adım adım talimat gösterir.
// - Uygulama zaten kurulu açıldıysa hiçbir şey göstermez.

import { useEffect, useMemo, useState } from 'react'
import { detectBrowser, installGuide, isStandalone } from './browser'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'bric-skor:install-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(v: boolean) {
  try {
    if (v) localStorage.setItem(DISMISS_KEY, '1')
    else localStorage.removeItem(DISMISS_KEY)
  } catch {
    // depolama kapalıysa önemli değil
  }
}

function useInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const browser = useMemo(() => detectBrowser(navigator.userAgent), [])
  const guide = useMemo(() => installGuide(browser), [browser])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // tarayıcının kendi küçük bildirimini değil, bizim butonu kullan
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = !installed && (promptEvent !== null || guide !== null)
  return { promptEvent, setPromptEvent, guide, browser, installed, canInstall }
}

function GuideSheet({ guide, onClose }: { guide: NonNullable<ReturnType<typeof installGuide>>; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.origin
  // Android'de bu bağlantı sayfayı doğrudan Chrome'da açar (Chrome yüklüyse)
  const chromeIntent = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Telefona kurulum"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        <h2 className="text-lg font-bold">Uygulamayı telefona kur</h2>
        <p className="mb-4 text-sm text-slate-500">{guide.title}</p>

        {guide.suggestChrome && (
          <div className="mb-5 space-y-2">
            <a
              href={chromeIntent}
              className="flex h-14 w-full flex-col items-center justify-center rounded-2xl bg-emerald-700 text-white"
            >
              <span className="font-semibold">Chrome'da aç ve kur</span>
              <span className="text-xs opacity-80">Önerilen · tek dokunuşla kurulur</span>
            </a>
            <button
              type="button"
              className="h-11 w-full rounded-2xl border border-slate-300 text-sm font-medium"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                } catch {
                  window.prompt('Bağlantıyı kopyala:', url)
                }
              }}
            >
              {copied ? 'Kopyalandı ✓' : 'Bağlantıyı kopyala (Chrome açılmazsa)'}
            </button>
            <div className="flex items-center gap-3 pt-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              ya da bu tarayıcıda kur
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <ol className="space-y-3">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs text-slate-500">
          Kurduktan sonra uygulama ana ekranda yeşil maça simgesiyle görünür ve internet olmadan da çalışır.
        </p>
        <button type="button" onClick={onClose} className="mt-4 h-12 w-full rounded-2xl bg-slate-100 font-medium">
          Tamam
        </button>
      </div>
    </div>
  )
}

/** Sayfanın üstünde görünen, kapatılabilir banner + alttaki küçük "kur" linki. */
export default function InstallBanner() {
  const { promptEvent, setPromptEvent, guide, canInstall } = useInstall()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [showGuide, setShowGuide] = useState(false)

  if (!canInstall) return null

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt()
      await promptEvent.userChoice
      setPromptEvent(null) // olay sadece bir kez kullanılabilir
    } else {
      setShowGuide(true)
    }
  }

  return (
    <>
      {!dismissed ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-700 p-3 text-white shadow-sm">
          <img src="/icon-192-v2.png" alt="" className="h-10 w-10 rounded-xl ring-2 ring-white/40" />
          <div className="flex-1 text-sm leading-tight">
            <div className="font-semibold">Telefona kur</div>
            <div className="opacity-80">Tam ekran açılır, internetsiz çalışır</div>
          </div>
          <button type="button" onClick={install} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
            Kur
          </button>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              writeDismissed(true)
              setDismissed(true)
            }}
            className="px-1 text-xl leading-none opacity-70"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={install}
          className="fixed bottom-3 right-3 z-40 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow"
        >
          📲 Telefona kur
        </button>
      )}

      {showGuide && guide && <GuideSheet guide={guide} onClose={() => setShowGuide(false)} />}
    </>
  )
}
