import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { createRecurring, updateRecurring, listIncidenciaTypes } from '../lib/api'
import { useData } from '../lib/useData'
import { useToast } from './Toast'
import { haptic } from '../lib/haptics'
import { recurrenceLabel, nextOccurrence, todayMadrid } from '../lib/date'
import { Alert, Wrench, Refresh } from './icons'

// Mismas categorías/zonas que ReportIncident (no exportadas allí; se replican aquí).
const CATS_MANT = [
  { key: 'aire', label: 'Aire acond.' },
  { key: 'puerta', label: 'Puerta' },
  { key: 'ventana', label: 'Ventana' },
  { key: 'parquet', label: 'Parquet' },
  { key: 'fontaneria', label: 'Fontanería' },
  { key: 'electricidad', label: 'Electricidad' },
  { key: 'mobiliario', label: 'Mobiliario' },
  { key: 'otro', label: 'Otro' },
]
const ZONES = ['Recepción', 'Sala principal', 'Sala spinning', 'Sala funcional', 'Vestuario hombres', 'Vestuario mujeres', 'Aseos', 'Zona de pesas']
const MONTHS = [
  { v: 1, l: 'Ene' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Abr' },
  { v: 5, l: 'May' }, { v: 6, l: 'Jun' }, { v: 7, l: 'Jul' }, { v: 8, l: 'Ago' },
  { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dic' },
]
const ALL_MONTHS = MONTHS.map((m) => m.v)

function emptyDraft(target) {
  return {
    target: target || 'mantenimiento',
    title: '', description: '',
    category: null, zone: null, priority: 'normal',
    months: [], day_of_month: 1, start_on: todayMadrid(), active: true,
  }
}

// editing: fila de recurring_tasks a editar, o null para crear.
// target: destino preseleccionado al crear ('mantenimiento' | 'incidencia').
export default function RecurringTaskSheet({ open, onClose, employee, target = 'mantenimiento', editing = null, onSaved }) {
  const toast = useToast()
  const [draft, setDraft] = useState(emptyDraft(target))
  const [busy, setBusy] = useState(false)

  // Etiquetas internas editables por el admin (igual criterio que ReportIncident).
  const isMant = draft.target === 'mantenimiento'
  const types = useData(() => (isMant ? Promise.resolve([]) : listIncidenciaTypes()), [isMant])
  const CATEGORIES = isMant ? CATS_MANT : (types.data || []).map((t) => ({ key: t.label, label: t.label }))

  useEffect(() => {
    if (!open) return
    if (editing) {
      setDraft({
        target: editing.target,
        title: editing.title || '',
        description: editing.description || '',
        category: editing.category || null,
        zone: editing.zone || null,
        priority: editing.priority || 'normal',
        months: editing.months || [],
        day_of_month: editing.day_of_month || 1,
        start_on: editing.start_on || todayMadrid(),
        active: editing.active ?? true,
      })
    } else {
      setDraft(emptyDraft(target))
    }
  }, [open, editing, target])

  function set(patch) { setDraft((d) => ({ ...d, ...patch })) }

  function toggleMonth(v) {
    set({ months: draft.months.includes(v) ? draft.months.filter((x) => x !== v) : [...draft.months, v] })
  }
  const allOn = draft.months.length === 12
  function toggleAll() { set({ months: allOn ? [] : [...ALL_MONTHS] }) }

  async function save() {
    if (!draft.title.trim()) { toast('Pon un título', 'error'); return }
    if (draft.months.length === 0) { toast('Elige al menos un mes', 'error'); return }
    setBusy(true)
    const payload = {
      target: draft.target,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category || null,
      zone: draft.zone || null,
      priority: draft.priority,
      months: [...draft.months].sort((a, b) => a - b),
      day_of_month: draft.day_of_month,
      start_on: draft.start_on,
      active: draft.active,
    }
    try {
      if (editing) {
        await updateRecurring(editing.id, payload)
      } else {
        await createRecurring({ ...payload, created_by: employee?.id || null, created_by_name: employee?.name || null })
      }
      haptic('success')
      toast(editing ? 'Tarea preventiva actualizada' : 'Tarea preventiva creada ✓')
      onClose()
      onSaved?.()
    } catch {
      toast('No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  const input = 'field'
  const next = nextOccurrence(draft.months, draft.day_of_month, draft.start_on)

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar tarea preventiva' : 'Nueva tarea preventiva'}>
      <p className="mb-4 text-sm text-ink/55">
        Se generará sola en los meses que elijas. Aparecerá como tarea pendiente para {isMant ? 'el técnico de mantenimiento' : 'el equipo'}.
      </p>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">¿Qué hay que hacer?</label>
      <input autoFocus value={draft.title} onChange={(e) => set({ title: e.target.value })}
        placeholder="Ej: Revisar filtros del aire acondicionado" className={`mb-4 ${input}`} />

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Detalle (opcional)</label>
      <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={2}
        placeholder="Instrucciones o notas…" className={`mb-4 ${input}`} />

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">¿Quién la hace?</label>
      <div className="mb-4 flex gap-2">
        {[
          { key: 'mantenimiento', label: 'Técnico', icon: Wrench },
          { key: 'incidencia', label: 'Equipo', icon: Alert },
        ].map((d) => {
          const Icon = d.icon
          const on = draft.target === d.key
          return (
            <button key={d.key} onClick={() => set({ target: d.key, category: null })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-95 ${on ? 'bg-ink text-white' : 'bg-ink/5 text-ink/55'}`}>
              <Icon size={18} /> {d.label}
            </button>
          )
        })}
      </div>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Tipo</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => set({ category: draft.category === c.key ? null : c.key })}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${draft.category === c.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Zona</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {ZONES.map((z) => (
          <button key={z} onClick={() => set({ zone: z === draft.zone ? null : z })}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${draft.zone === z ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/70'}`}>
            {z}
          </button>
        ))}
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wide text-ink/40">¿En qué meses?</label>
        <button onClick={toggleAll} className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${allOn ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/55'}`}>
          Todos los meses
        </button>
      </div>
      <div className="mb-4 grid grid-cols-6 gap-1.5">
        {MONTHS.map((m) => {
          const on = draft.months.includes(m.v)
          return (
            <button key={m.v} onClick={() => toggleMonth(m.v)}
              className={`rounded-xl py-2 text-sm font-bold transition active:scale-90 ${on ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/50'}`}>
              {m.l}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Día del mes</label>
          <select value={draft.day_of_month} onChange={(e) => set({ day_of_month: Number(e.target.value) })} className={input}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">A partir de</label>
          <input type="date" value={draft.start_on} onChange={(e) => set({ start_on: e.target.value })} className={input} />
        </div>
      </div>

      {draft.months.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-sand-50 px-4 py-3 text-sm">
          <Refresh size={16} className="mt-0.5 shrink-0 text-bronze" />
          <span className="text-ink/70">
            <span className="font-semibold">{recurrenceLabel(draft.months)}</span> · día {draft.day_of_month}
            {next ? <><br /><span className="text-ink/45">Próxima: {next}</span></> : <><br /><span className="text-ink/45">No se generará antes de la fecha de inicio.</span></>}
          </span>
        </div>
      )}

      <button onClick={() => set({ priority: draft.priority === 'urgent' ? 'normal' : 'urgent' })}
        className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition ${draft.priority === 'urgent' ? 'border-terracotta bg-terracotta/8' : 'border-ink/10 bg-white'}`}>
        <span className="flex items-center gap-2 font-semibold">
          <Alert size={18} className={draft.priority === 'urgent' ? 'text-terracotta' : 'text-ink/40'} />
          Marcar como urgente
        </span>
        <span className={`relative h-6 w-11 rounded-full transition ${draft.priority === 'urgent' ? 'bg-terracotta' : 'bg-ink/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft.priority === 'urgent' ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>

      <button onClick={() => set({ active: !draft.active })}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition ${draft.active ? 'border-sage bg-sage/8' : 'border-ink/10 bg-white'}`}>
        <span className="flex items-center gap-2 font-semibold">
          <Refresh size={18} className={draft.active ? 'text-sage' : 'text-ink/40'} />
          Activa
        </span>
        <span className={`relative h-6 w-11 rounded-full transition ${draft.active ? 'bg-sage' : 'bg-ink/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft.active ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>

      <button onClick={save} disabled={busy}
        className="btn-primary">
        {editing ? 'Guardar cambios' : 'Crear tarea preventiva'}
      </button>
    </Sheet>
  )
}
