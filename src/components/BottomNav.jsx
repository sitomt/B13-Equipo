import { useState } from 'react'
import { Plus } from './icons'
import ActionSheet from './ActionSheet'
import { haptic } from '../lib/haptics'

// Píldora de navegación flotante. Las pestañas son de VISUALIZACIÓN;
// toda creación/edición sale del "+" integrado en el extremo derecho
// (zona natural del pulgar), que abre un ActionSheet con las acciones del rol.
export default function BottomNav({ tabs, active, onChange, actions, actionsTitle }) {
  const [plusOpen, setPlusOpen] = useState(false)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
      aria-label="Navegación principal"
    >
      <div className="glass overflow-hidden rounded-xl3 bg-ink/[0.92] shadow-float ring-1 ring-white/[0.08]">
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <div className="no-scrollbar flex flex-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon
              const on = active === t.key
              // Burbuja de no-leídos (t.badge): número opcional sobre el icono.
              const badge = t.badge > 0 ? (t.badge > 9 ? '9+' : t.badge) : null
              return (
                <button
                  key={t.key}
                  onClick={() => { if (!on) haptic('tap'); onChange(t.key) }}
                  aria-current={on ? 'page' : undefined}
                  aria-label={badge ? `${t.label}, ${t.badge} sin leer` : t.label}
                  title={t.label}
                  className={`relative flex h-[50px] min-w-[52px] flex-1 items-center justify-center rounded-2xl transition-enter ${
                    on ? 'bg-white/[0.07] text-bronze-glow' : 'text-white/40'
                  }`}
                >
                  {/* Indicador de pestaña activa: no depende solo del color (skill color-not-only / nav-state-active) */}
                  <span
                    className={`absolute top-0.5 h-1 w-1 rounded-full bg-bronze-glow transition-enter ${
                      on ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative" aria-hidden="true">
                    <Icon size={22} strokeWidth={on ? 2.2 : 1.8} />
                    {badge && (
                      <span
                        className="tabular absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-terracotta px-1 text-[9px] font-bold text-white"
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          {actions?.length > 0 && (
            <>
              <span className="h-8 w-px shrink-0 bg-white/10" aria-hidden="true" />
              <button
                onClick={() => { haptic('tap'); setPlusOpen(true) }}
                aria-label="Crear o editar"
                aria-expanded={plusOpen}
                className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-bronze-glow to-bronze-dark text-white shadow-glow ring-1 ring-white/25 transition-enter active:scale-90"
              >
                <Plus size={24} />
              </button>
            </>
          )}
        </div>
      </div>
      {actions?.length > 0 && (
        <ActionSheet open={plusOpen} onClose={() => setPlusOpen(false)} title={actionsTitle} actions={actions} />
      )}
    </nav>
  )
}
