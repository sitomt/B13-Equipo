import Sheet from './Sheet'
import { haptic } from '../lib/haptics'

// Menú de creación/edición (se abre desde el "+" del navbar).
// actions: [{ icon, label, hint?, tone?, onClick }] — misma forma que las del
// antiguo SpeedDial para que la migración sea mecánica.
export default function ActionSheet({ open, onClose, title = '¿Qué quieres hacer?', actions }) {
  const tones = {
    bronze: 'bg-bronze/15 text-bronze-dark',
    ink: 'bg-ink/8 text-ink',
    terracotta: 'bg-terracotta/15 text-terracotta',
    sage: 'bg-sage/15 text-sage',
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-1 pb-2">
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={() => { haptic('tap'); onClose(); a.onClick() }}
              className="flex min-h-[54px] w-full animate-rise-in items-center gap-3.5 rounded-2xl px-3 text-left transition active:scale-[0.98] active:bg-ink/[0.04]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tones[a.tone] || tones.bronze}`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-ink">{a.label}</span>
                {a.hint && <span className="block truncate text-xs text-ink/45">{a.hint}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
