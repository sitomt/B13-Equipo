import Sheet from './Sheet'
import { haptic } from '../lib/haptics'

// Menú de creación/edición (se abre desde el "+" del navbar, abajo a la
// derecha). Todo alineado a la DERECHA (icono junto al pulgar) y ordenado de
// menos a más usado: lo más frecuente queda abajo, lo más cerca del pulgar.
// actions: [{ icon, label, hint?, group?, onClick }]. Si traen `group`, se
// pinta una cabecera de sección antes de cada grupo; sin group, listado plano.
// Iconos con estilo único (bronce) para que el menú se lea como un todo.
export default function ActionSheet({ open, onClose, title = '¿Qué quieres hacer?', actions }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-1 pb-2">
        {actions.map((a, i) => {
          const Icon = a.icon
          const newGroup = a.group && a.group !== actions[i - 1]?.group
          return (
            <div key={a.label}>
              {newGroup && (
                <p
                  className={`animate-rise-in px-3 pb-1 text-right text-xs font-bold uppercase tracking-wide text-ink/40 ${i > 0 ? 'pt-3' : ''}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {a.group}
                </p>
              )}
              <button
                onClick={() => { haptic('tap'); onClose(); a.onClick() }}
                className="flex min-h-[54px] w-full animate-rise-in flex-row-reverse items-center gap-3.5 rounded-2xl px-3 text-right transition active:scale-[0.98] active:bg-ink/[0.04]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bronze/15 text-bronze-dark">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-ink">{a.label}</span>
                  {a.hint && <span className="block truncate text-xs text-ink/45">{a.hint}</span>}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
