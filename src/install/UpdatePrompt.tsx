// "Yeni sürüm hazır" şeridi.
//
// Yeni bir sürüm yayınlanınca tarayıcı onu arka planda indirir; bu şerit kullanıcıya haber verir
// ve tek dokunuşla yeni sürüme geçirir. Böylece uygulamayı kapatıp açmaya gerek kalmaz.

import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000 // açık kaldığı sürece saatte bir kontrol et

export default function UpdatePrompt() {
  const reg = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      reg.current = registration
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }
      // uygulama her öne geldiğinde (telefonda tekrar açıldığında) yeni sürüm var mı bak
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.setInterval(check, CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div
        role="status"
        className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-xl"
      >
        <span className="text-xl">✨</span>
        <div className="flex-1 text-sm leading-tight">
          <div className="font-semibold">Yeni sürüm hazır</div>
          <div className="opacity-70">Girilen skorlar kaybolmaz.</div>
        </div>
        <button
          type="button"
          onClick={() => {
            // Bekleyen yeni sürüm varsa ona geç; yoksa (ör. siteye ilk girişte yeni sürüm zaten devreye girdiyse) sayfayı yenile
            if (reg.current?.waiting) void updateServiceWorker(true)
            else window.location.reload()
          }}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Yenile
        </button>
        <button
          type="button"
          aria-label="Sonra"
          onClick={() => setNeedRefresh(false)}
          className="px-1 text-xl leading-none opacity-60"
        >
          ×
        </button>
      </div>
    </div>
  )
}
