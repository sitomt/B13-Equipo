import { createContext, useContext, useCallback, useState } from 'react'
import { Check, Alert } from './icons'
import { haptic } from '../lib/haptics'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  // push(mensaje, tipo, action?) — action = { label, onClick } para "Deshacer".
  const push = useCallback((message, type = 'success', action = null) => {
    const id = Math.random().toString(36).slice(2)
    haptic(type === 'error' ? 'error' : 'success')
    setToasts((t) => [...t, { id, message, type, action }])
    // Más tiempo si hay acción que el usuario debe poder pulsar (skill toast-dismiss)
    setTimeout(() => dismiss(id), action ? 5000 : 2600)
  }, [dismiss])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-3 pt-safe"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass pointer-events-auto flex items-center gap-2.5 rounded-full py-2.5 pl-4 text-sm font-semibold text-white shadow-float ring-1 ring-white/15 animate-slide-up ${
              t.action ? 'pr-2' : 'pr-4'
            } ${t.type === 'error' ? 'bg-terracotta/95' : 'bg-ink/90'}`}
          >
            {t.type === 'error' ? <Alert size={18} /> : <Check size={18} />}
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action.onClick(); dismiss(t.id) }}
                className="ml-1 min-h-[44px] rounded-full bg-white/15 px-3 text-xs font-bold text-white transition-enter active:scale-90"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast dentro de ToastProvider')
  return ctx
}
