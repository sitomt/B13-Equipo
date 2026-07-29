import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLockBody } from './ui'
import { X } from './icons'

// Bottom sheet móvil: aparece desde abajo, fondo oscurecido.
export default function Sheet({ open, onClose, title, children, footer, maxH = '85vh' }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const returnFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
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
        onCloseRef.current()
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
  }, [open])

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
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-xl3 bg-sand-50 shadow-sheet ring-1 ring-white/60 animate-slide-up sm:rounded-xl3"
        style={{ maxHeight: maxH }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-1">
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
        <div className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 ${footer ? 'pb-4' : 'pb-8'}`}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-ink/[0.07] bg-sand-50/95 px-5 pb-safe pt-3">
            <div className="pb-3">{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
