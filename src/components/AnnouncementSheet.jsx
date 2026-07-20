import { useState } from 'react'
import Sheet from './Sheet'
import { createAnnouncement } from '../lib/api'
import { useToast } from './Toast'
import { todayMadrid } from '../lib/date'
import { Megaphone } from './icons'

const ROLES = [
  { key: 'coach', label: 'Coaches' },
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'maintenance', label: 'Mantenimiento' },
]
const ROLE_LABELS = { coach: 'Coaches', cleaning: 'Limpieza', maintenance: 'Mantenimiento', admin: 'Dirección' }
const DURATIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

function endsOnFor(duration) {
  const base = new Date(todayMadrid() + 'T00:00:00')
  if (duration === 'today') return todayMadrid()
  if (duration === 'week') {
    base.setDate(base.getDate() + 6)
    return base.toISOString().slice(0, 10)
  }
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return end.toISOString().slice(0, 10)
}

// Composer rápido de avisos. Lo usa el admin (con opción de destacar), el coach
// (authorRole='coach', sin destacar; se muestran de forma más sutil) y limpieza/
// mantenimiento (fixedRoles=['coach']: solo pueden avisar a coaches, no entre ellos).
export default function AnnouncementSheet({
  open, onClose, employee, onCreated,
  authorRole = 'admin', allowHighlight = true,
  fixedRoles = null, title: sheetTitle = 'Aviso al equipo',
}) {
  const toast = useToast()
  const defaultRoles = fixedRoles || ['coach', 'cleaning', 'maintenance']
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [roles, setRoles] = useState(defaultRoles)
  const [duration, setDuration] = useState('today')
  const [high, setHigh] = useState(false)
  const [busy, setBusy] = useState(false)

  function toggleRole(r) {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))
  }

  function reset() {
    setTitle(''); setBody(''); setRoles(defaultRoles); setDuration('today'); setHigh(false)
  }

  const fixedLabel = fixedRoles
    ? fixedRoles.map((r) => ROLE_LABELS[r] || r).join(', ')
    : null

  async function submit() {
    if (!title.trim()) { toast('Pon un título', 'error'); return }
    if (!roles.length) { toast('Elige a quién', 'error'); return }
    setBusy(true)
    try {
      const today = todayMadrid()
      await createAnnouncement({
        title: title.trim(), body: body.trim() || null,
        target_roles: roles, priority: (allowHighlight && high) ? 'high' : 'normal',
        starts_on: today, ends_on: endsOnFor(duration),
        created_by: employee.id, created_by_name: employee.name,
        created_by_role: authorRole,
      })
      toast('Aviso publicado ✓')
      reset()
      onClose()
      onCreated?.()
    } catch { toast('No se pudo publicar', 'error') } finally { setBusy(false) }
  }

  const input = 'field'

  return (
    <Sheet open={open} onClose={onClose} title={sheetTitle}>
      <p className="mb-4 text-sm text-ink/55">
        {fixedLabel
          ? `Comunica algo a ${fixedLabel.toLowerCase()}. Les aparece en su pantalla mientras esté activo.`
          : 'Comunica algo al equipo. Les aparece en su pantalla mientras esté activo.'}
      </p>

      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del aviso" className={`${input} mb-3`} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Detalle (opcional)" className={`${input} mb-4`} />

      {fixedLabel ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-ink/40">Para:</span>
          <span className="font-semibold text-ink/70">{fixedLabel}</span>
        </div>
      ) : (
        <>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">¿Quién lo ve?</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => toggleRole(r.key)}
                className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${roles.includes(r.key) ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Duración</p>
      <div className="mb-4 flex gap-2">
        {DURATIONS.map((d) => (
          <button key={d.key} onClick={() => setDuration(d.key)}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${duration === d.key ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/70'}`}>
            {d.label}
          </button>
        ))}
      </div>

      {allowHighlight && (
        <button onClick={() => setHigh((v) => !v)} className="mb-5 flex w-full items-center justify-between rounded-2xl border border-ink/10 px-4 py-3.5">
          <span className="font-semibold">Destacar (resaltado en bronce)</span>
          <span className={`relative h-6 w-11 rounded-full transition ${high ? 'bg-bronze' : 'bg-ink/15'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${high ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      )}

      <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 btn-primary">
        <Megaphone size={20} /> Publicar aviso
      </button>
    </Sheet>
  )
}
