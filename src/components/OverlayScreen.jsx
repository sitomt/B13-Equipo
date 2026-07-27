import { Wordmark } from './Logo'
import { Chevron } from './icons'
import { useLockBody } from './ui'

// Pantalla dedicada a pantalla completa (edición, secciones del perfil…).
// Patrón estándar: header oscuro sticky con "Volver", contenido scrollable y
// un `footer` opcional fijo abajo para el CTA principal.
export default function OverlayScreen({ title, onClose, footer, children }) {
  useLockBody(false) // el overlay scrollea por sí mismo; el body queda debajo
  return (
    <div className="fixed inset-0 z-50 !m-0 flex h-dvh flex-col bg-sand">
      <header className="z-10 shrink-0 bg-ink px-5 pb-4 pt-safe text-white shadow-pop">
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 px-4 text-sm font-semibold active:scale-95"
          >
            <Chevron size={16} className="rotate-180" /> Volver
          </button>
          <Wordmark variant="white" className="h-4 w-auto" />
        </div>
        <h1 className="mt-3 font-display text-section font-extrabold">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`mx-auto max-w-md px-4 pt-4 ${footer ? 'pb-6' : 'pb-10'}`}>{children}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-ink/[0.08] bg-sand-50/95 px-4 pb-safe pt-3 shadow-sheet">
          <div className="mx-auto max-w-md pb-3">{footer}</div>
        </div>
      )}
    </div>
  )
}
