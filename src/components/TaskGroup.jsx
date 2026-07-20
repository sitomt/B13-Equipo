import { useState } from 'react'
import { ChevronDown, Check } from './icons'
import { haptic } from '../lib/haptics'

// Sección desplegable DENTRO de una card (Apertura / Tareas de hoy / Cierre).
// Unifica los dos patrones anteriores (Collapsible local y CollapsibleSection):
// cabecera con icono, título, progreso "n/m" y check verde al completar.
export default function TaskGroup({ icon: Icon, title, done = 0, total = 0, defaultOpen = true, action, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const complete = total > 0 && done >= total
  function toggle() { haptic('tap'); setOpen((v) => !v) }
  return (
    <div>
      {/* Cabecera: la zona título despliega; la acción es un botón aparte */}
      <div className="flex w-full items-center gap-2 px-4 py-2.5">
        <button onClick={toggle} aria-expanded={open} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${complete ? 'bg-sage/15 text-sage' : 'bg-ink/5 text-ink/60'}`}>
            {complete ? <Check size={20} /> : <Icon size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-card font-bold text-ink">{title}</p>
            {total > 0 && (
              <p className={`tabular text-xs ${complete ? 'font-semibold text-sage' : 'text-ink/45'}`}>
                {complete ? 'Completada ✓' : `${done}/${total} completadas`}
              </p>
            )}
          </div>
          <ChevronDown size={20} className={`shrink-0 text-ink/30 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {action}
      </div>
      {open && (
        <div className="animate-rise-in divide-y divide-ink/[0.06] border-t border-ink/[0.06]">{children}</div>
      )}
    </div>
  )
}
