import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { entriesForDay, addManualEntry, updateTimeEntry, deleteTimeEntry, KIND_LABEL } from '../lib/api'
import { todayMadrid } from '../lib/date'
import { fmtMinutes, workedMinutesForDay } from '../lib/hours'
import { useToast } from './Toast'
import { Trash, Plus, Clock } from './icons'

const KINDS = ['clock_in', 'break_start', 'break_end', 'meal_start', 'meal_end', 'clock_out']

// Construye un ISO a partir de la fecha (YYYY-MM-DD) y la hora (HH:MM) locales.
function toISO(date, hm) {
  const d = new Date(`${date}T${hm}:00`)
  return isNaN(d) ? null : d.toISOString()
}
function hmOf(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Correcciones de fichaje del admin: revisar y ajustar el día de un empleado.
// Pensado como herramienta de EXCEPCIÓN (GPS fallido, turno auto-cerrado, etc.).
export default function TimeEntriesEditor({ open, onClose, employee }) {
  const toast = useToast()
  const [date, setDate] = useState(todayMadrid())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [newKind, setNewKind] = useState('clock_out')
  const [newTime, setNewTime] = useState('')

  async function load() {
    if (!employee) return
    setLoading(true)
    try { setRows(await entriesForDay(employee.id, date)) }
    catch { toast('No se pudieron cargar los fichajes', 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { if (open) load() /* eslint-disable-next-line */ }, [open, date, employee?.id])

  async function changeTime(row, hm) {
    const iso = toISO(date, hm)
    if (!iso) return
    try { await updateTimeEntry(row.id, { occurred_at: iso }); await load(); toast('Hora corregida ✓') }
    catch { toast('No se pudo corregir', 'error') }
  }
  async function remove(row) {
    try { await deleteTimeEntry(row.id); await load(); toast('Fichaje eliminado') }
    catch { toast('No se pudo eliminar', 'error') }
  }
  async function add() {
    if (!newTime) { toast('Pon una hora', 'error'); return }
    const iso = toISO(date, newTime)
    if (!iso) { toast('Hora no válida', 'error'); return }
    try { await addManualEntry(employee.id, newKind, iso, date); setNewTime(''); await load(); toast('Fichaje añadido ✓') }
    catch { toast('No se pudo añadir', 'error') }
  }

  const worked = rows.length ? fmtMinutes(workedMinutesForDay(rows)) : '—'

  return (
    <Sheet open={open} onClose={onClose} title={`Fichajes · ${employee?.name?.split(' ')[0] || ''}`}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Día</label>
      <input type="date" value={date} max={todayMadrid()} onChange={(e) => setDate(e.target.value)} className="mb-4 field" />

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-3">
        <span className="text-sm font-semibold text-ink/55">Trabajado ese día</span>
        <span className="tabular font-display text-xl font-extrabold text-ink">{worked}</span>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-ink/40">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink/40">Sin fichajes ese día.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-ink/[0.06]">
              <span className="flex-1 text-sm font-semibold text-ink">
                {KIND_LABEL[r.kind]}
                {r.auto_closed && <span className="ml-1.5 rounded-full bg-ochre/15 px-2 py-0.5 text-[10px] font-bold text-[#8a6a1e]">AUTO</span>}
              </span>
              <input
                type="time"
                defaultValue={hmOf(r.occurred_at)}
                onBlur={(e) => { if (e.target.value && e.target.value !== hmOf(r.occurred_at)) changeTime(r, e.target.value) }}
                className="w-24 rounded-xl bg-ink/[0.04] px-2 py-1.5 text-sm font-semibold text-ink"
              />
              <button onClick={() => remove(r)} aria-label="Eliminar" className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-terracotta active:scale-90">
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Añadir fichaje manual */}
      <div className="rounded-2xl bg-ink/[0.04] p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink/40"><Clock size={13} /> Añadir fichaje</p>
        <div className="flex items-center gap-2">
          <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className="min-h-[44px] flex-1 rounded-xl bg-white px-2.5 text-base font-semibold text-ink ring-1 ring-ink/[0.06]">
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="min-h-[44px] w-28 rounded-xl bg-white px-2 text-base font-semibold text-ink ring-1 ring-ink/[0.06]" />
          <button onClick={add} aria-label="Añadir" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white active:scale-90">
            <Plus size={18} />
          </button>
        </div>
      </div>
    </Sheet>
  )
}
