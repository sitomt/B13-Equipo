import { useState } from 'react'
import Sheet from './Sheet'
import { Chevron, ChevronDown, Check } from './icons'
import { Spinner } from './ui'
import { haptic } from '../lib/haptics'

// ============================================================================
// Controles interactivos estándar de la app.
// Regla transversal: todo elemento táctil mide ≥44px de alto (≈50px con margen).
// Jerarquía: Info = texto plano · Tag = estado · Button = acción · Select/Chip = filtro.
// ============================================================================

// Botón de acción. `primary` es el CTA de marca (bronze): las acciones
// principales de cada pantalla (Publicar, Guardar, Enviar) usan SIEMPRE esta variante.
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  full = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const variants = {
    primary:
      'bg-gradient-to-br from-bronze-glow to-bronze-dark text-white font-extrabold shadow-glow',
    ink: 'bg-gradient-to-br from-ink-soft to-ink text-white font-extrabold shadow-float',
    secondary: 'bg-ink/5 text-ink/70 font-bold',
    danger: 'bg-terracotta text-white font-extrabold shadow-float',
    ghost: 'bg-transparent text-bronze-dark font-bold',
    sage: 'bg-sage text-white font-extrabold shadow-float',
  }
  const sizes = {
    md: 'min-h-[50px] px-5 text-base rounded-2xl gap-2',
    sm: 'min-h-[44px] px-4 text-sm rounded-xl gap-1.5',
  }
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-enter active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Spinner className="h-5 w-5 border-white/30 border-t-white" /> : Icon && <Icon size={size === 'sm' ? 16 : 19} />}
      {children}
    </button>
  )
}

// Chip seleccionable (filtros y opciones de formulario). Área táctil ≥44px.
export function Chip({ selected = false, icon: Icon, disabled, className = '', onClick, children, ...props }) {
  return (
    <button
      onClick={(e) => { haptic('tap'); onClick?.(e) }}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${
        selected ? 'bg-ink text-white shadow-pop' : 'bg-ink/[0.05] text-ink/60'
      } ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  )
}

// Filtro estándar tipo dropdown: botón campo que abre un bottom-sheet con opciones.
// options: [{ value, label, icon?, hint? }]
export function Select({ label, value, options, onChange, placeholder = 'Seleccionar', className = '' }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        className={`flex min-h-[50px] w-full items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-sand-25 px-4 text-left transition active:scale-[0.99] ${className}`}
      >
        <span className="min-w-0">
          {label && <span className="block text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</span>}
          <span className={`block truncate text-base font-semibold ${current ? 'text-ink' : 'text-ink/40'}`}>
            {current ? current.label : placeholder}
          </span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-ink/40" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label || placeholder}>
        <div role="listbox" className="space-y-1 pb-2">
          {options.map((o) => {
            const on = o.value === value
            return (
              <button
                key={String(o.value)}
                role="option"
                aria-selected={on}
                onClick={() => { haptic('tap'); onChange(o.value); setOpen(false) }}
                className={`flex min-h-[50px] w-full items-center gap-3 rounded-2xl px-4 text-left transition active:scale-[0.98] ${
                  on ? 'bg-bronze/10 text-ink' : 'text-ink/75'
                }`}
              >
                {o.icon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink/60">
                    <o.icon size={17} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-ink/45">{o.hint}</span>}
                </span>
                {on && <Check size={18} className="shrink-0 text-bronze-dark" />}
              </button>
            )
          })}
        </div>
      </Sheet>
    </>
  )
}

// Control segmentado para alternar sub-vistas dentro de una pestaña.
export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-2xl bg-ink/[0.05] p-1 ${className}`}>
      {options.map((o) => {
        const Icon = o.icon
        const on = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => { if (!on) haptic('tap'); onChange(o.key) }}
            aria-pressed={on}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition ${
              on ? 'bg-white text-ink shadow-card' : 'text-ink/50'
            }`}
          >
            {Icon && <Icon size={15} />} {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Stepper de navegación temporal: ‹ etiqueta › (el patrón de Horarios,
// ahora estándar para semanas/periodos en toda la app).
export function WeekStepper({ label, sublabel, onPrev, onNext, prevDisabled, nextDisabled, children, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <button
        onClick={() => { haptic('tap'); onPrev() }}
        disabled={prevDisabled}
        aria-label="Anterior"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink/60 transition active:scale-90 disabled:opacity-30"
      >
        <Chevron size={18} className="rotate-180" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate font-display text-card font-extrabold capitalize tracking-tight">{label}</p>
        {sublabel && <p className="text-xs font-semibold text-ink/45">{sublabel}</p>}
        {children}
      </div>
      <button
        onClick={() => { haptic('tap'); onNext() }}
        disabled={nextDisabled}
        aria-label="Siguiente"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink/60 transition active:scale-90 disabled:opacity-30"
      >
        <Chevron size={18} />
      </button>
    </div>
  )
}
