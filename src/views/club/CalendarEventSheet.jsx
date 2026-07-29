import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Button } from '../../components/controls'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { Trash } from '../../components/icons'

export default function CalendarEventSheet({ open, date, editing, onClose, onSaved }) {
  const toast = useToast()
  const [eventDate, setEventDate] = useState(date)
  const [title, setTitle] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setEventDate(editing?.event_date || date)
    setTitle(editing?.title || '')
    setEventTime(editing?.event_time?.slice(0, 5) || '')
    setDetails(editing?.note || '')
    setDirty(false)
    setDiscarding(false)
    setConfirmDelete(false)
    setError('')
  }, [open, date, editing])

  function change(setter, value) {
    setter(value)
    setDirty(true)
    setDiscarding(false)
    setConfirmDelete(false)
    setError('')
  }

  function requestClose() {
    if (busy) return
    if (dirty) {
      setDiscarding(true)
      return
    }
    onClose()
  }

  async function save() {
    if (!eventDate) {
      setError('Elige el día del evento.')
      return
    }
    if (!title.trim()) {
      setError('Escribe un nombre para el evento.')
      return
    }

    setBusy(true)
    setError('')
    const payload = {
      event_date: eventDate,
      entry_type: 'event',
      kind: 'festivo',
      title: title.trim(),
      note: details.trim() || null,
      event_time: eventTime || null,
      open_time: null,
      close_time: null,
    }
    try {
      if (editing) await updateCalendarEvent(editing.id, payload)
      else await createCalendarEvent(payload)
      haptic('success')
      toast(editing ? 'Evento actualizado' : 'Evento añadido al calendario')
      setDirty(false)
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo guardar el evento. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await deleteCalendarEvent(editing.id)
      haptic('warning')
      toast('Evento eliminado')
      setDirty(false)
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo eliminar el evento.')
    } finally {
      setBusy(false)
    }
  }

  const footer = discarding ? (
    <div role="alert" className="space-y-2">
      <p className="text-center text-sm font-semibold text-ink/70">Tienes cambios sin guardar.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => setDiscarding(false)}>
          Seguir editando
        </Button>
        <Button variant="danger" size="sm" onClick={() => { setDirty(false); onClose() }}>
          Descartar
        </Button>
      </div>
    </div>
  ) : (
    <Button full loading={busy} onClick={save}>
      {editing ? 'Guardar cambios' : 'Añadir evento'}
    </Button>
  )

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      title={editing ? 'Editar evento' : 'Añadir evento'}
      maxH="92vh"
      footer={footer}
    >
      <div className="space-y-4 pb-1">
        <label className="block">
          <span className="field-label">Día</span>
          <input
            type="date"
            value={eventDate}
            onChange={(event) => change(setEventDate, event.target.value)}
            className="field min-h-[50px] font-semibold"
          />
        </label>

        <label className="block">
          <span className="field-label">Evento</span>
          <input
            value={title}
            onChange={(event) => change(setTitle, event.target.value)}
            placeholder="Ej. Formación de equipo"
            className="field"
            data-sheet-autofocus={!editing ? '' : undefined}
          />
        </label>

        <label className="block">
          <span className="field-label">Hora (opcional)</span>
          <input
            type="time"
            value={eventTime}
            onChange={(event) => change(setEventTime, event.target.value)}
            className="field min-h-[50px] font-semibold tabular"
          />
        </label>

        <label className="block">
          <span className="field-label">Detalles (opcional)</span>
          <textarea
            value={details}
            onChange={(event) => change(setDetails, event.target.value)}
            rows={3}
            placeholder="Información que necesita conocer el equipo"
            className="field resize-none"
          />
        </label>

        <p className="rounded-2xl bg-bronze/10 px-4 py-3 text-sm leading-relaxed text-ink/65">
          El evento aparecerá en el día elegido y en la agenda del mes. No modificará el horario del gimnasio.
        </p>

        {editing && (
          confirmDelete ? (
            <div className="rounded-2xl bg-terracotta/[0.08] p-2">
              <p className="px-2 pb-2 text-sm font-semibold text-terracotta">¿Eliminar este evento?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" loading={busy} onClick={remove}>
                  Sí, eliminar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-terracotta active:bg-terracotta/[0.06]"
            >
              <Trash size={17} /> Eliminar evento
            </button>
          )
        )}

        {error && <p role="alert" className="field-error !px-0">{error}</p>}
      </div>
    </Sheet>
  )
}
