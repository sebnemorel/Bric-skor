// Kulüpte asılacak kurulum QR'ı: telefon kamerasıyla okutulunca site doğrudan
// Safari'de (iPhone) / Chrome'da (Android) açılır; WhatsApp/GitHub içi tarayıcı sorunu yaşanmaz.
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export default function InstallQR({ back }: { back: () => void }) {
  const url = window.location.origin
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 1, color: { dark: '#1e2f6b', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [url])

  return (
    <div className="space-y-4">
      <button type="button" onClick={back} className="text-sm font-medium text-emerald-800 print:hidden">
        ‹ Geri
      </button>

      <section className="rounded-2xl bg-white p-6 text-center shadow-sm print:shadow-none">
        <h2 className="text-2xl font-bold">Briç Skor Akdeniz</h2>
        <p className="mb-4 text-slate-500">Telefonuna kurmak için kamerayla okut</p>
        {src ? (
          <img src={src} alt={`Kurulum QR kodu: ${url}`} className="mx-auto w-full max-w-72" />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-72 items-center justify-center text-slate-400">QR hazırlanıyor…</div>
        )}
        <p className="mt-3 font-mono text-sm text-slate-600">{url.replace(/^https?:\/\//, '')}</p>

        <div className="mt-6 grid gap-4 text-left text-sm sm:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="mb-1 font-semibold">📱 iPhone</div>
            <ol className="list-decimal space-y-1 pl-5 text-slate-700">
              <li>Kamerayla QR'ı okut, Safari'de aç</li>
              <li>••• (üç nokta) → Paylaş</li>
              <li>Ana Ekrana Ekle → Ekle</li>
            </ol>
          </div>
          <div>
            <div className="mb-1 font-semibold">🤖 Android</div>
            <ol className="list-decimal space-y-1 pl-5 text-slate-700">
              <li>Kamerayla QR'ı okut, Chrome'da aç</li>
              <li>"Telefona kur" → Kur</li>
              <li>Çıkmazsa ⋮ → Uygulamayı yükle</li>
            </ol>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => window.print()}
        className="h-12 w-full rounded-2xl bg-emerald-700 font-semibold text-white print:hidden"
      >
        🖨 Yazdır
      </button>
    </div>
  )
}
