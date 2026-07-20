import { useLockBody } from './ui'
import { X } from './icons'

// Bottom sheet móvil: aparece desde abajo, fondo oscurecido.
export default function Sheet({ open, onClose, title, children, maxH = '85vh' }) {
  useLockBody(open)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md animate-slide-up rounded-t-xl3 bg-sand-50 shadow-sheet ring-1 ring-white/60 sm:rounded-xl3"
        style={{ maxHeight: maxH }}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <h3 className="font-display text-2xl font-extrabold tracking-tight">{title}</h3>
          <button
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
    </div>
  )
}
