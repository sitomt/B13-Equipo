import { useState } from 'react'
import { haptic } from '../lib/haptics'
import { daysBetween, relativeTime, shortDate, todayMadrid } from '../lib/date'
import { Avatar } from './ui'
import CommentThread from './CommentThread'
import { Megaphone, User, Check, ChevronDown } from './icons'

const ROLE_ES = { coach: 'Coach', cleaning: 'Limpieza', maintenance: 'Mantenimiento', admin: 'Dirección' }

// "caduca hoy" / "caduca mañana" / "caduca en N días"
function expiryLabel(endsOn) {
  const n = daysBetween(todayMadrid(), endsOn)
  if (n <= 0) return 'caduca hoy'
  if (n === 1) return 'caduca mañana'
  return `caduca en ${n} días`
}

// Nombre de pila para las filas de acuse (compactas).
const firstName = (name) => (name || '').split(' ')[0]

// ============================================================================
// Aviso con transparencia total para la pestaña "Avisos": autor, vigencia y
// quién lo ha leído (todos ven todo). Mantiene los dos lenguajes visuales de
// AnnouncementCard: nota de compañero discreta vs. aviso de dirección
// destacado. El marcado como leído NO ocurre aquí: lo hace useAnnouncements
// al abrir la pestaña.
// ============================================================================
export default function AnnouncementDetailCard({ a, stat, past = false, comments = [], employee, empById, onSend }) {
  const [readsOpen, setReadsOpen] = useState(false)
  const fromPeer = a.created_by_role && a.created_by_role !== 'admin'
  const high = a.priority === 'high'
  const allRead = stat.total > 0 && stat.pending.length === 0

  // Línea de contexto: autor + vigencia, información en texto plano.
  const infoLine = [
    `De ${a.created_by_name || 'Dirección'} · ${ROLE_ES[a.created_by_role] || 'Dirección'}`,
    past ? `finalizó ${shortDate(a.ends_on)}` : `activo ${relativeTime(a.created_at)} · ${expiryLabel(a.ends_on)}`,
  ].join(' · ')

  return (
    <div
      className={`overflow-hidden rounded-xl2 ${
        fromPeer ? 'border border-ink/[0.07] bg-sand-50' : 'card-line bg-white shadow-card'
      } ${high && !past ? 'border-l-4 border-l-bronze' : ''} ${past ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl ${
            fromPeer ? 'h-8 w-8 bg-ink/5 text-ink/45' : 'h-9 w-9 bg-bronze/12 text-bronze-dark'
          }`}
        >
          <Megaphone size={fromPeer ? 15 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`leading-tight ${fromPeer ? 'font-semibold text-ink/80' : 'font-display text-card font-bold text-ink'}`}>
            {a.title}
          </p>
          {a.body && <p className={`mt-0.5 text-sm leading-snug ${fromPeer ? 'text-ink/55' : 'text-ink/60'}`}>{a.body}</p>}
          <p className="mt-1.5 flex items-center gap-1 text-xs text-ink/40">
            <User size={11} className="shrink-0" /> {infoLine}
          </p>
        </div>
      </div>

      {/* Acuse de lectura: todos ven quién lo ha leído y a quién le falta */}
      {stat.total > 0 && (
        <div className="border-t border-ink/[0.06]">
          <button
            onClick={() => { haptic('tap'); setReadsOpen((o) => !o) }}
            aria-expanded={readsOpen}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 text-left active:bg-ink/[0.03]"
          >
            {allRead ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-sage">
                <Check size={14} /> Leído por todos
              </span>
            ) : (
              <span className="tabular text-xs font-bold text-ink/50">
                Leído {stat.read.length}/{stat.total}
              </span>
            )}
            <ChevronDown size={16} className={`ml-auto text-ink/30 transition-transform ${readsOpen ? 'rotate-180' : ''}`} />
          </button>
          {readsOpen && (
            <div className="space-y-2 px-4 pb-3.5 animate-rise-in">
              {stat.read.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Check size={13} className="shrink-0 text-sage" />
                  {stat.read.map((e) => (
                    <span key={e.id} className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                      <Avatar emp={e} size={20} /> {firstName(e.name)}
                    </span>
                  ))}
                </div>
              )}
              {stat.pending.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-xs font-semibold text-ink/40">Falta:</span>
                  {stat.pending.map((e) => (
                    <span key={e.id} className="flex items-center gap-1.5 text-xs font-semibold text-ink/45">
                      <Avatar emp={e} size={20} /> {firstName(e.name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversación bajo el aviso (en anteriores solo lectura, sin input) */}
      <CommentThread
        comments={comments}
        employee={employee}
        empById={empById}
        onSend={onSend ? (body) => onSend(a, body) : undefined}
        readOnly={past || !onSend}
        tone={fromPeer ? 'sand' : 'white'}
      />
    </div>
  )
}
