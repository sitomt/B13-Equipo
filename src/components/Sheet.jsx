import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLockBody } from './ui'
import { X } from './icons'

// Bottom sheet móvil: aparece desde abajo, fondo oscurecido.
export default function Sheet({ open, onClose, title, children, maxH = '85vh' }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const returnFocusRef = useRef(null)
  useLockBody(open)

  useEffect(() => {
    if (!open) return undefined
    returnFocusRef.current = document.activeElement
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')

    const focusTimer = window.setTimeout(() => {
      const target =
        panelRef.current?.querySelector(
          '[data-sheet-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        ) ||
        panelRef.current?.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      target?.focus()
    }, 0)

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )]
      if (focusable.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      root?.removeAttribute('inert')
      root?.removeAttribute('aria-hidden')
      window.setTimeout(() => {
        if (!document.querySelector('[role="dialog"]')) returnFocusRef.current?.focus?.()
      }, 0)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar diálogo"
        className="absolute inset-0 animate-fade-in cursor-default bg-ink/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md animate-slide-up rounded-t-xl3 bg-sand-50 shadow-sheet ring-1 ring-white/60 sm:rounded-xl3"
        style={{ maxHeight: maxH }}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink/60 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>
        <div className="no-scrollbar overflow-y-auto px-5 pb-8" style={{ maxHeight: `calc(${maxH} - 4rem)` }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
