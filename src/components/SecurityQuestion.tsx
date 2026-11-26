// Yönetici değişikliği kaydedilmeden önce sorulan güvenlik sorusu.
import { useState } from 'react'
import { verifyMasterAnswer } from '../cloud/api'

export const SECURITY_QUESTION = 'Hakemin ilk evcil hayvanının adı nedir?'

export default function SecurityQuestion({ password, onDone }: {
  password: string
  /** Doğru cevap ya da vazgeçildiyse null. */
  onDone: (answer: string | null) => void
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await verifyMasterAnswer(password, value)
      if (r.ok) onDone(value)
      else if (r.locked) setMsg('Çok fazla yanlış deneme: yönetici girişi kilitlendi. Kilidi Supabase panelinden açabilirsin.')
      else if (!r.configured) setMsg('Güvenlik sorusunun cevabı henüz Supabase\'de ayarlanmamış.')
      else setMsg('Cevap yanlış.')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <form
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
        onSubmit={e => {
          e.preventDefault()
          if (value.trim() && !busy) void submit()
        }}
      >
        <div className="text-sm font-medium text-slate-500">🔒 Son adım: güvenlik sorusu</div>
        <div className="text-lg font-bold">{SECURITY_QUESTION}</div>
        <input
          autoFocus
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
          value={value}
          onChange={e => {
            setValue(e.target.value)
            setMsg(null)
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <p className="text-xs text-slate-400">Büyük/küçük harf önemli değil. Doğruysa değişiklik kaydedilir.</p>
        {msg && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onDone(null)} className="h-12 rounded-xl bg-slate-100 font-medium">
            Vazgeç
          </button>
          <button type="submit" disabled={!value.trim() || busy} className="h-12 rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-40">
            {busy ? '…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
