import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Button, Chip } from '../../components/controls'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { parseDate } from '../../lib/date'
import { Trash, Star, Clock, Lock } from '../../components/icons'

// Tipos de día excepcional. El horario semanal normal NO se toca aquí.
export const KINDS = [
  { key: 'festivo', label: 'Festivo', icon: Star },
  { key: 'especial', label: 'Horario especial', icon: Clock },
  { key: 'cerrado', label: 'Cerrado', icon: Lock },
]

const inp = 'w-full rounded-2xl border border-ink/10 bg-sand-25 px-4 py-3 text-base outline-none focus:border-bronze'
const timeInp = 'rounded-xl border border-ink/10 bg-white px-2 py-2.5 text-base font-semibold tabular outline-none focus:border-bronze'

// Editor de un día del calendario (solo admin). `date` = 'YYYY-MM-DD'.
// `editing` = evento existente o null (alta).
export default function CalendarEventSheet({ open, date, editing, onClose, onSaved }) {
  const toast = useToast()
  const [kind, setKind] = useState('festivo')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [openTime, setOpenTime] = useState('10:00')
  const [closeTime, setCloseTime] = useState('14:00')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmDel(false)
    if (editing) {
      setKind(editing.kind)
      setTitle(editing.title || '')
      setNote(editing.note || '')
      setOpenTime(editing.open_time ? editing.open_time.slice(0, 5) : '10:00')
      setCloseTime(editing.close_time ? editing.close_time.slice(0, 5) : '14:00')
    } else {
      setKind('festivo'); setTitle(''); setNote(''); setOpenTime('10:00'); setCloseTime('14:00')
    }
  }, [open, editing])

  const dateLabel = date
    ? parseDate(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  async function save() {
    if (!title.trim()) { toast('Ponle un nombre al día', 'error'); return }
    if (kind === 'especial' && closeTime <= openTime) { toast('El cierre debe ser posterior', 'error'); return }
    setBusy(true)
    const payload = {
      event_date: date,
      kind,
      title: title.trim(),
      note: note.trim() || null,
      open_time: kind === 'especial' ? openTime : null,
      close_time: kind === 'especial' ? closeTime : null,
    }
    try {
      if (editing) await updateCalendarEvent(editing.id, payload)
      else await createCalendarEvent(payload)
      haptic('success')
      toast(editing ? 'Día actualizado ✓' : 'Día añadido al calendario ✓')
      onSaved()
      onClose()
    } catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteCalendarEvent(editing.id)
      haptic('warning')
      toast('Día eliminado')
      onSaved()
      onClose()
    } catch { toast('No se pudo eliminar', 'error') } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar día' : 'Añadir día'}>
      <p className="-mt-1 mb-4 text-sm capitalize text-ink/50">{dateLabel}</p>

      <div className="space-y-4 pb-2">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Tipo de día</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k.key} icon={k.icon} selected={kind === k.key} onClick={() => setKind(k.key)}>
                {k.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Nombre</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Navidad, Festivo local…" className={inp} autoFocus={!editing} />
        </div>

        {kind === 'especial' && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Horario ese día</p>
            <div className="flex items-center gap-2">
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={`${timeInp} flex-1`} />
              <span className="text-ink/30">→</span>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={`${timeInp} flex-1`} />
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Nota (opcional)</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Detalle para el equipo…" className={inp} />
        </div>

        <Button variant="primary" full loading={busy} onClick={save}>
          {editing ? 'Guardar cambios' : 'Añadir al calendario'}
        </Button>

        {editing && (
          confirmDel ? (
            <div className="flex items-center gap-2 rounded-2xl bg-terracotta/8 p-2">
              <span className="flex-1 px-2 text-sm font-semibold text-terracotta">¿Eliminar este día?</span>
              <button onClick={() => setConfirmDel(false)} className="min-h-[44px] rounded-xl bg-white px-3 text-sm font-bold text-ink/60 active:scale-95">Cancelar</button>
              <button onClick={remove} disabled={busy} className="min-h-[44px] rounded-xl bg-terracotta px-3 text-sm font-extrabold text-white active:scale-95 disabled:opacity-50">Sí, eliminar</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-sm font-bold text-terracotta active:scale-95">
              <Trash size={16} /> Eliminar día
            </button>
          )
        )}
      </div>
    </Sheet>
  )
}
