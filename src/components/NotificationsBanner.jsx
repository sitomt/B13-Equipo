import { useEffect, useState } from 'react'
import { enablePush, notificationsEnabled, pushSupported, isIOS, isStandalone } from '../lib/push'
import { useSession } from '../state/session'
import { useToast } from './Toast'
import { Bell, X } from './icons'

const DISMISS_KEY = 'b13.notif.banner.dismissed'

// Banner contextual para activar notificaciones. Saca el push del fondo del
// menú de cuenta: aparece donde el equipo ve sus avisos. Se autooculta si ya
// están activas, no se soportan, o el usuario lo descartó.
export default function NotificationsBanner() {
  const { employee } = useSession()
  const toast = useToast()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushSupported()) return
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch { /* modo privado */ }
    if (dismissed) return
    notificationsEnabled().then((on) => setShow(!on)).catch(() => setShow(true))
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* modo privado */ }
  }

  async function activate() {
    setBusy(true)
    try {
      await enablePush(employee)
      toast('Notificaciones activadas ✓')
      setShow(false)
    } catch (e) {
      if (e.message === 'ios-install') toast('Añade la app a tu pantalla de inicio para activarlas', 'error')
      else if (e.message === 'denied') toast('Permiso denegado. Actívalo en los ajustes del móvil', 'error')
      else toast('No se pudieron activar', 'error')
    } finally { setBusy(false) }
  }

  if (!show) return null
  const iosNeedsInstall = isIOS() && !isStandalone()

  return (
    <div className="flex items-center gap-3 rounded-xl2 border border-bronze/20 bg-bronze/[0.07] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze/15 text-bronze-dark">
        <Bell size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">No te pierdas ningún aviso</p>
        <p className="text-xs text-ink/55">
          {iosNeedsInstall ? 'Añade la app a tu inicio y actívalas' : 'Recíbelos como notificación en el móvil'}
        </p>
      </div>
      <button
        onClick={activate}
        disabled={busy}
        className="min-h-[44px] shrink-0 rounded-full bg-ink px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
      >
        {busy ? 'Activando…' : 'Activar'}
      </button>
      <button onClick={dismiss} aria-label="Descartar" className="flex h-11 w-11 shrink-0 items-center justify-center text-ink/30 active:scale-90">
        <X size={16} />
      </button>
    </div>
  )
}
