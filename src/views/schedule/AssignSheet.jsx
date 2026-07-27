import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Avatar } from '../../components/ui'
import { assignBandShift, deleteShift, updateShift } from '../../lib/api'
import { haptic } from '../../lib/haptics'
import { Check, Pencil, Trash } from '../../components/icons'
import { parseDate } from '../../lib/date'
import { bandRange, hLabel } from './TimeBandGrid'

const ROLE_ORDER = ['coach', 'cleaning', 'maintenance']
const ROLE_GROUP = { coach: 'Coaches', cleaning: 'Limpieza', maintenance: 'Mantenimiento' }
const PUESTOS = ['Recepción', 'Sala', 'Clases', 'Otro']

// Ajuste fino de un turno ya asignado (horas / puesto distintos de la franja).
function AdjustRow({ shift, onChanged, toast }) {
  const [start, setStart] = useState(shift.start_time.slice(0, 5))
  const [end, setEnd] = useState(shift.end_time.slice(0, 5))
  const [puesto, setPuesto] = useState(shift.puesto || null)
  const [busy, setBusy] = useState(false)
  const dirty = start !== shift.start_time.slice(0, 5) || end !== shift.end_time.slice(0, 5) || (puesto || null) !== (shift.puesto || null)
  const inp = 'rounded-xl border border-ink/10 bg-white px-2 py-2.5 text-base font-semibold tabular outline-none focus:border-bronze'

  async function save() {
    if (end <= start) { toast('La salida debe ser posterior', 'error'); return }
    setBusy(true)
    try { await updateShift(shift.id, { start_time: start, end_time: end, puesto }); haptic('success'); toast('Turno guardado ✓'); await onChanged() }
    catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  return (
    <div className="mt-2 rounded-2xl bg-ink/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inp} flex-1`} />
        <span className="text-ink/30">→</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inp} flex-1`} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PUESTOS.map((p) => (
          <button key={p} onClick={() => setPuesto(puesto === p ? null : p)}
            className={`min-h-[44px] rounded-full px-3.5 text-sm font-semibold transition active:scale-95 ${puesto === p ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/60'}`}>
            {p}
          </button>
        ))}
      </div>
      {dirty && (
        <button onClick={save} disabled={busy} className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-sage text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          <Check size={16} /> Guardar cambios
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Asignación en 3 toques: celda del cuadrante → este sheet → tocar empleado.
// Tocar a alguien sin turno lo asigna con las horas de la franja; tocar a
// alguien ya asignado lo quita. "Ajustar" permite horas/puesto especiales.
// ============================================================================
export default function AssignSheet({ state, staff, onClose, onChanged, createdBy, toast }) {
  const [busyId, setBusyId] = useState(null)
  const [adjusting, setAdjusting] = useState(null) // shift.id en ajuste fino
  if (!state) return null
  const { band, date, assignments } = state
  const byEmp = new Map(assignments.map((s) => [s.employee_id, s]))
  const dateLabel = parseDate(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  async function toggle(emp) {
    if (busyId) return
    const existing = byEmp.get(emp.id)
    setBusyId(emp.id)
    try {
      if (existing) {
        await deleteShift(existing.id)
        haptic('warning')
        toast(`${emp.name.split(' ')[0]} quitado del turno`)
      } else {
        await assignBandShift({ employeeId: emp.id, date, band, createdBy })
        haptic('success')
        toast(`${emp.name.split(' ')[0]} asignado ✓`)
      }
      await onChanged()
    } catch { toast('No se pudo guardar', 'error') } finally { setBusyId(null) }
  }

  const staffByRole = {}
  for (const e of staff) (staffByRole[e.role] ||= []).push(e)

  return (
    <Sheet open onClose={onClose} title={band.extra ? 'Fuera de franja' : `Franja ${bandRange(band)}`}>
      <p className="-mt-1 mb-4 text-sm capitalize text-ink/50">{dateLabel}{band.label && !band.extra ? ` · ${band.label}` : ''}</p>

      {band.extra ? (
        /* Turnos antiguos sin franja: solo ajustar o quitar */
        <div className="space-y-3 pb-2">
          {assignments.map((s) => {
            const e = staff.find((x) => x.id === s.employee_id)
            if (!e) return null
            return (
              <div key={s.id} className="rounded-2xl border border-ink/10 p-3">
                <div className="flex items-center gap-3">
                  <Avatar emp={e} size={32} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{e.name}</span>
                  <span className="tabular text-sm font-bold text-ink/60">{hLabel(s.start_time.slice(0, 5))}–{hLabel(s.end_time.slice(0, 5))}</span>
                  <button onClick={() => toggle(e)} aria-label="Quitar" className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-terracotta active:scale-90">
                    <Trash size={16} />
                  </button>
                </div>
                <AdjustRow shift={s} onChanged={onChanged} toast={toast} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          {ROLE_ORDER.map((role) => {
            const list = staffByRole[role] || []
            if (!list.length) return null
            return (
              <div key={role}>
                <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">{ROLE_GROUP[role]}</p>
                <div className="space-y-1">
                  {list.map((e) => {
                    const shift = byEmp.get(e.id)
                    const on = !!shift
                    return (
                      <div key={e.id}>
                        <div className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3 transition ${on ? 'bg-sage/[0.08]' : ''}`}>
                          <button
                            onClick={() => toggle(e)}
                            disabled={busyId === e.id}
                            className="flex min-h-[54px] min-w-0 flex-1 items-center gap-3 text-left active:opacity-70 disabled:opacity-50"
                          >
                            <Avatar emp={e} size={34} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-ink">{e.name}</span>
                              {on && (
                                <span className="tabular block text-xs font-semibold text-sage">
                                  {hLabel(shift.start_time.slice(0, 5))}–{hLabel(shift.end_time.slice(0, 5))}{shift.puesto ? ` · ${shift.puesto}` : ''}
                                </span>
                              )}
                            </span>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${on ? 'border-sage bg-sage text-white animate-pop' : 'border-ink/20 text-transparent'}`}>
                              <Check size={15} strokeWidth={3} />
                            </span>
                          </button>
                          {on && (
                            <button
                              onClick={() => setAdjusting(adjusting === shift.id ? null : shift.id)}
                              aria-label="Ajustar horas"
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-90 ${adjusting === shift.id ? 'bg-bronze/15 text-bronze-dark' : 'bg-ink/5 text-ink/45'}`}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                        </div>
                        {on && adjusting === shift.id && <AdjustRow shift={shift} onChanged={onChanged} toast={toast} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
