import { useEffect, useId } from 'react'
import Sheet from './Sheet'

export function Card({ className = '', children, ...p }) {
  return (
    <div className={`card-line rounded-xl2 bg-white shadow-card ${className}`} {...p}>
      {children}
    </div>
  )
}

// Avatar de empleado: muestra su foto de perfil si la tiene, si no las iniciales sobre su color.
export function Avatar({ emp, size = 40, className = '' }) {
  const dim = { width: size, height: size }
  if (emp?.photo_url) {
    return (
      <img
        src={emp.photo_url}
        alt={emp.name || ''}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover shadow-sm ring-1 ring-white/60 ${className}`}
        style={dim}
      />
    )
  }
  const initials = (emp?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white shadow-sm ring-1 ring-white/60 ${className}`}
      style={{ ...dim, background: emp?.color || '#2C2925', fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}

// Placeholder con shimmer para cargas >300ms (skill §3 progressive-loading).
// Reserva el espacio para evitar saltos de layout (CLS).
export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-sand-200/70 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

// Esqueleto de tarjeta de tarea (imita la fila real para una transición sin salto).
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-24 w-full rounded-xl2" />
      <div className="divide-y divide-ink/[0.06] rounded-xl2 bg-white shadow-card">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Diálogo de confirmación para acciones sensibles (skill §8 confirmation-dialogs).
// Reutiliza el bottom-sheet de marca; separa la acción destructiva visualmente.
export function ConfirmSheet({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', tone = 'ink' }) {
  const tones = {
    ink: 'bg-ink text-white',
    danger: 'bg-terracotta text-white',
    sage: 'bg-sage text-white',
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message && <p className="px-1 pb-5 text-[15px] leading-relaxed text-ink/65">{message}</p>}
      <div className="flex gap-3 pb-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-2xl bg-ink/5 py-3.5 font-bold text-ink/70 transition-enter active:scale-95"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`flex-1 rounded-2xl py-3.5 font-extrabold transition-enter active:scale-95 ${tones[tone]}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink/70 ${className}`} />
  )
}

export function FullLoader({ label = 'Cargando…' }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 text-ink/50">
      <Spinner className="h-7 w-7" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

// Tag de ESTADO. Solo para estados que clasifican un recurso; la información
// pura (fechas, "en directo", categorías) va como texto plano, nunca en tag.
const TAG_STATUS = {
  pending: { cls: 'bg-terracotta/15 text-terracotta', label: 'Pendiente' },
  in_progress: { cls: 'bg-ochre/20 text-[#8a6a1e]', label: 'En curso' },
  done: { cls: 'bg-sage/15 text-sage', label: 'Resuelta' },
  urgent: { cls: 'bg-terracotta/15 text-terracotta', label: 'URGENTE' },
  draft: { cls: 'bg-ochre/20 text-[#8a6a1e]', label: 'Borrador' },
  published: { cls: 'bg-sage/15 text-sage', label: 'Publicado' },
  active: { cls: 'bg-sage/15 text-sage', label: 'Activo' },
}
export function Tag({ status, children, className = '' }) {
  const meta = TAG_STATUS[status] || TAG_STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-xs font-bold ${meta.cls} ${className}`}>
      {children ?? meta.label}
    </span>
  )
}

// Contador discreto en cabeceras de sección (semántica de conteo, no de estado).
export function CountBadge({ tone = 'bronze', children, className = '' }) {
  const tones = {
    bronze: 'bg-bronze/15 text-bronze-dark',
    ink: 'bg-ink/8 text-ink',
    terracotta: 'bg-terracotta/15 text-terracotta',
    sage: 'bg-sage/15 text-sage',
    ochre: 'bg-ochre/20 text-[#8a6a1e]',
  }
  return (
    <span className={`tabular inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-[3px] text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

// Título de card (nivel 3 de la jerarquía: pantalla > sección > card > contenido)
export function CardTitle({ className = '', children }) {
  return <h3 className={`font-display text-card font-bold text-ink ${className}`}>{children}</h3>
}

// Anillo de progreso (para % de agenda). Al llegar al 100% vira a sage y
// emite un destello de celebración (skill §7 motion-meaning; gamificación positiva).
export function ProgressRing({ value, size = 56, stroke = 6, color = '#B98A5E', track = '#E9E3D9', children }) {
  const gid = useId()
  const v = Math.min(1, Math.max(0, value))
  const complete = v >= 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (v * c)
  const strokeColor = complete ? '#5E8C61' : color
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {complete && (
        <span className="absolute inset-0 animate-flash rounded-full bg-sage/40" aria-hidden="true" />
      )}
      <svg width={size} height={size} className="-rotate-90">
        {/* Gradiente del trazo: del color pleno a una versión más luminosa (profundidad) */}
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease, stroke .4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl2 border border-dashed border-ink/15 py-9 text-center text-ink/40">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bronze/10 text-bronze-dark shadow-glow">
          <Icon size={24} />
        </span>
      )}
      <p className="text-sm font-semibold text-ink/55">{title}</p>
      {subtitle && <p className="px-8 text-xs">{subtitle}</p>}
    </div>
  )
}

// Bloquea el scroll del body mientras hay un modal/sheet abierto
export function useLockBody(active) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}
