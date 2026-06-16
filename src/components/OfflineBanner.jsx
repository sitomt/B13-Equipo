import { useEffect, useState } from 'react'
import { pendingCount, subscribe, isOffline, flush } from '../lib/offline'

// Indicador discreto: aparece cuando no hay conexión o hay acciones en cola
// pendientes de enviar. Se va solo cuando todo se ha sincronizado.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline())
  const [pending, setPending] = useState(pendingCount())

  useEffect(() => {
    const unsub = subscribe(setPending)
    const on = () => { setOffline(false); flush().catch(() => {}) }
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { unsub(); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline && pending === 0) return null
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-bold text-white"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)', background: offline ? '#B5654A' : '#8a6a1e' }}
    >
      <span className="h-2 w-2 rounded-full bg-white/80" />
      {offline
        ? `Sin conexión${pending ? ` · ${pending} sin enviar` : ''} · tu trabajo se guarda`
        : `Sincronizando ${pending} acción${pending === 1 ? '' : 'es'}…`}
    </div>
  )
}
