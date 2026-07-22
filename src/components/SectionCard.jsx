import { useState, Children } from 'react'
import { Card } from './ui'
import { ChevronDown, Check } from './icons'
import { haptic } from '../lib/haptics'

// ============================================================================
// SectionCard: LA sección estándar de la app. Una card única con la cabecera
// DENTRO y el contenido como filas (divide-y) de la misma card, para que se
// entienda qué pertenece a qué (patrón "Tu día"). Sustituye al viejo
// CollapsibleSection (título flotante + contenido suelto).
//
// - `done`/`total`: muestra el progreso "n/m completadas" bajo el título y
//   vira el icono a check sage al completar. Si no, `subtitle` opcional.
// - `right`: extra no interactivo en cabecera (típicamente CountBadge).
// - `action`: control interactivo (p.ej. "Marcar todo") FUERA del botón toggle.
// - `persistKey`: recuerda abierto/cerrado en localStorage ('1'/'0'); si no
//   hay valor guardado manda `defaultOpen`.
// - `flat`: sin Card exterior, para anidar dentro de una card mayor (ex-TaskGroup).
// - `empty`: {icon, text} → fila discreta cuando no hay children.
// ============================================================================
export default function SectionCard({
  icon: Icon, title, subtitle, done = 0, total = 0, right, action,
  persistKey, defaultOpen = true, flat = false, tone = 'bronze', empty,
  className = '', children,
}) {
  const [open, setOpen] = useState(() => {
    try {
      const v = persistKey ? localStorage.getItem(persistKey) : null
      return v === null ? defaultOpen : v === '1'
    } catch {
      return defaultOpen
    }
  })

  function toggle() {
    haptic('tap')
    setOpen((o) => {
      const next = !o
      try { if (persistKey) localStorage.setItem(persistKey, next ? '1' : '0') } catch { /* ignora quota/privado */ }
      return next
    })
  }

  const complete = total > 0 && done >= total
  const iconBox = complete
    ? 'bg-sage/15 text-sage'
    : tone === 'ink'
      ? 'bg-ink/5 text-ink/60'
      : 'bg-bronze/12 text-bronze-dark'

  const kids = Children.toArray(children)
  const EmptyIcon = empty?.icon

  const body = (
    <>
      {/* Cabecera: la zona título despliega; `action` es un control aparte */}
      <div className="flex w-full items-center gap-2 px-4 py-2.5">
        <button onClick={toggle} aria-expanded={open} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${iconBox}`}>
            {complete ? <Check size={20} /> : Icon && <Icon size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-card font-bold text-ink">{title}</p>
            {total > 0 ? (
              <p className={`tabular text-xs ${complete ? 'font-semibold text-sage' : 'text-ink/45'}`}>
                {complete ? 'Completada ✓' : `${done}/${total} completadas`}
              </p>
            ) : subtitle ? (
              <p className="text-xs text-ink/45">{subtitle}</p>
            ) : null}
          </div>
          {right}
          <ChevronDown size={20} className={`shrink-0 text-ink/30 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {action}
      </div>
      {open && (kids.length > 0 ? (
        <div className="animate-rise-in divide-y divide-ink/[0.06] border-t border-ink/[0.06]">{children}</div>
      ) : empty ? (
        <div className="animate-rise-in border-t border-ink/[0.06]">
          <div className="flex items-center gap-2 p-4 text-xs text-ink/40">
            {EmptyIcon && <EmptyIcon size={16} />}
            <span>{empty.text}</span>
          </div>
        </div>
      ) : null)}
    </>
  )

  if (flat) return <div className={className}>{body}</div>
  return <Card className={`overflow-hidden ${className}`}>{body}</Card>
}
