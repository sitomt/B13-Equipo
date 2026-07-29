import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Button, SegmentedControl } from '../../components/controls'
import {
  createCalendarEvent,
  createClubSchedule,
  deleteCalendarEvent,
  updateCalendarEvent,
  updateClubSchedule,
} from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { Calendar, Clock, Lock, Refresh } from '../../components/icons'
import {
  addDaysKey,
  formatFullDate,
  hm,
  scheduleExceptionForDay,
  scheduleForDay,
} from './calendarModel'

const MODES = [
  { key: 'regular', label: 'Horario habitual', icon: Calendar },
  { key: 'day', label: 'Un solo día', icon: Clock },
]

const EMPTY_HOURS = {
  weekday_open: '07:00',
  weekday_close: '22:00',
  weekday_closed: false,
  saturday_open: '09:00',
  saturday_close: '18:00',
  saturday_closed: false,
  sunday_open: '09:00',
  sunday_close: '14:00',
  sunday_closed: true,
}

const inputClass = 'field !rounded-xl !bg-white !px-3 !py-2.5 font-semibold tabular'

function scheduleFields(schedule) {
  if (!schedule) return EMPTY_HOURS
  return {
    weekday_open: hm(schedule.weekday_open) || EMPTY_HOURS.weekday_open,
    weekday_close: hm(schedule.weekday_close) || EMPTY_HOURS.weekday_close,
    weekday_closed: Boolean(schedule.weekday_closed),
    saturday_open: hm(schedule.saturday_open) || EMPTY_HOURS.saturday_open,
    saturday_close: hm(schedule.saturday_close) || EMPTY_HOURS.saturday_close,
    saturday_closed: Boolean(schedule.saturday_closed),
    sunday_open: hm(schedule.sunday_open) || EMPTY_HOURS.sunday_open,
    sunday_close: hm(schedule.sunday_close) || EMPTY_HOURS.sunday_close,
    sunday_closed: Boolean(schedule.sunday_closed),
  }
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-11 w-12 shrink-0"
    >
      <span
        className={`absolute left-0 top-2 h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-ink' : 'bg-ink/15'
        }`}
      />
      <span
        className={`absolute top-3 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function HoursRow({ title, group, hours, setHours }) {
  const closedKey = `${group}_closed`
  const openKey = `${group}_open`
  const closeKey = `${group}_close`
  const closed = hours[closedKey]

  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-white p-3">
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <strong className="text-sm text-ink">{title}</strong>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${closed ? 'text-terracotta' : 'text-ink/35'}`}>
            {closed ? 'Cerrado' : 'Abierto'}
          </span>
          <Switch
            checked={closed}
            label={`Cerrar ${title.toLowerCase()}`}
            onChange={(value) => setHours((current) => ({ ...current, [closedKey]: value }))}
          />
        </div>
      </div>
      {!closed && (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label>
            <span className="sr-only">Apertura de {title.toLowerCase()}</span>
            <input
              type="time"
              value={hours[openKey]}
              onChange={(event) => setHours((current) => ({ ...current, [openKey]: event.target.value }))}
              className={inputClass}
            />
          </label>
          <span className="text-ink/25">–</span>
          <label>
            <span className="sr-only">Cierre de {title.toLowerCase()}</span>
            <input
              type="time"
              value={hours[closeKey]}
              onChange={(event) => setHours((current) => ({ ...current, [closeKey]: event.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
      )}
    </div>
  )
}

function validHours(hours) {
  return [
    ['Lunes a viernes', hours.weekday_closed, hours.weekday_open, hours.weekday_close],
    ['Sábado', hours.saturday_closed, hours.saturday_open, hours.saturday_close],
    ['Domingo', hours.sunday_closed, hours.sunday_open, hours.sunday_close],
  ].find(([, closed, open, close]) => !closed && (!open || !close || close <= open))
}

export default function CalendarScheduleSheet({
  open,
  initialDate,
  schedules,
  entries,
  initialMode = 'regular',
  onClose,
  onSaved,
}) {
  const toast = useToast()
  const [mode, setMode] = useState('regular')
  const [date, setDate] = useState(initialDate)
  const [temporary, setTemporary] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [hours, setHours] = useState(EMPTY_HOURS)
  const [dayType, setDayType] = useState(null)
  const [dayOpen, setDayOpen] = useState('08:00')
  const [dayClose, setDayClose] = useState('18:00')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [error, setError] = useState('')

  const exactRegular = useMemo(() => (
    (schedules || [])
      .filter((item) => item.start_date === date)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0] || null
  ), [date, schedules])
  const dayException = useMemo(
    () => scheduleExceptionForDay(entries, date),
    [date, entries],
  )

  useEffect(() => {
    if (!open) return
    const nextDate = initialDate
    const current = scheduleForDay(schedules, nextDate)
    const exact = current?.start_date === nextDate ? current : null
    const exception = scheduleExceptionForDay(entries, nextDate)
    setMode(initialMode)
    setDate(nextDate)
    setTemporary(Boolean(exact?.end_date))
    setEndDate(exact?.end_date || addDaysKey(nextDate, 30))
    setHours(scheduleFields(exact || current))
    setEditingScheduleId(exact?.id || null)
    setDayType(exception?.kind === 'cerrado' ? 'closed' : exception?.kind === 'especial' ? 'special' : null)
    setDayOpen(hm(exception?.open_time) || '08:00')
    setDayClose(hm(exception?.close_time) || '18:00')
    setReason(exception?.note || exception?.title || '')
    setDirty(false)
    setDiscarding(false)
    setConfirmRestore(false)
    setError('')
  }, [open, initialDate, schedules, entries, initialMode])

  function mark(update) {
    setDirty(true)
    setDiscarding(false)
    setConfirmRestore(false)
    setError('')
    update()
  }

  function loadDate(nextDate) {
    const current = scheduleForDay(schedules, nextDate)
    const exact = current?.start_date === nextDate ? current : null
    const exception = scheduleExceptionForDay(entries, nextDate)
    setDate(nextDate)
    setTemporary(Boolean(exact?.end_date))
    setEndDate(exact?.end_date || addDaysKey(nextDate, 30))
    setHours(scheduleFields(exact || current))
    setEditingScheduleId(exact?.id || null)
    setDayType(exception?.kind === 'cerrado' ? 'closed' : exception?.kind === 'especial' ? 'special' : null)
    setDayOpen(hm(exception?.open_time) || '08:00')
    setDayClose(hm(exception?.close_time) || '18:00')
    setReason(exception?.note || exception?.title || '')
    setDirty(true)
    setDiscarding(false)
    setConfirmRestore(false)
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
    setError('')
    if (mode === 'regular') {
      const invalid = validHours(hours)
      if (invalid) {
        setError(`La hora de cierre de ${invalid[0].toLowerCase()} debe ser posterior a la apertura.`)
        return
      }
      if (temporary && (!endDate || endDate < date)) {
        setError('La fecha final debe ser igual o posterior a la fecha de inicio.')
        return
      }

      const payload = {
        start_date: date,
        end_date: temporary ? endDate : null,
        ...hours,
      }
      const target = (schedules || []).find((item) => item.id === editingScheduleId)
        || (schedules || [])
          .filter((item) => item.start_date === date && Boolean(item.end_date) === temporary)
          .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0]

      setBusy(true)
      try {
        if (target) await updateClubSchedule(target.id, payload)
        else await createClubSchedule(payload)
        haptic('success')
        toast(temporary ? 'Horario temporal guardado' : 'Horario habitual actualizado')
        setDirty(false)
        await onSaved()
        onClose()
      } catch (saveError) {
        setError(saveError?.code === 'CLUB_SCHEDULES_PENDING'
          ? 'Falta aplicar la migración del calendario antes de guardar horarios.'
          : 'No se pudo guardar el horario. Inténtalo de nuevo.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (!dayType) {
      setError('Elige si el gimnasio cerrará o tendrá un horario diferente.')
      return
    }
    if (dayType === 'special' && (!dayOpen || !dayClose || dayClose <= dayOpen)) {
      setError('La hora de cierre debe ser posterior a la apertura.')
      return
    }

    const payload = {
      event_date: date,
      entry_type: 'schedule',
      kind: dayType === 'closed' ? 'cerrado' : 'especial',
      title: reason.trim() || (dayType === 'closed' ? 'Gimnasio cerrado' : 'Horario especial'),
      note: reason.trim() || null,
      open_time: dayType === 'special' ? dayOpen : null,
      close_time: dayType === 'special' ? dayClose : null,
      event_time: null,
    }

    setBusy(true)
    try {
      if (dayException) await updateCalendarEvent(dayException.id, payload)
      else await createCalendarEvent(payload)
      haptic('success')
      toast(`Cambio guardado para el ${formatFullDate(date)}`)
      setDirty(false)
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo guardar el cambio de ese día.')
    } finally {
      setBusy(false)
    }
  }

  async function restoreDay() {
    if (!dayException) return
    setBusy(true)
    try {
      await deleteCalendarEvent(dayException.id)
      haptic('warning')
      toast('Horario habitual restaurado')
      setDirty(false)
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo restaurar el horario habitual.')
    } finally {
      setBusy(false)
    }
  }

  const regularSummary = (() => {
    const label = (group) => (
      hours[`${group}_closed`]
        ? 'cerrado'
        : `${hours[`${group}_open`]}–${hours[`${group}_close`]}`
    )
    const period = temporary
      ? `Del ${formatFullDate(date)} al ${formatFullDate(endDate)}`
      : `Desde el ${formatFullDate(date)}`
    return `${period}: L–V ${label('weekday')} · Sáb ${label('saturday')} · Dom ${label('sunday')}.`
  })()

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
    <Button
      full
      loading={busy}
      disabled={mode === 'day' && !dayType}
      onClick={save}
    >
      {mode === 'regular'
        ? exactRegular ? 'Actualizar horario habitual' : 'Guardar horario habitual'
        : dayException ? 'Actualizar cambio del día' : 'Guardar cambio del día'}
    </Button>
  )

  return (
    <Sheet open={open} onClose={requestClose} title="Editar horario" maxH="94vh" footer={footer}>
      <div className="space-y-5 pb-1">
        <div>
          <span className="field-label">Qué quieres cambiar</span>
          <SegmentedControl
            options={MODES}
            value={mode}
            onChange={(value) => mark(() => setMode(value))}
          />
          <p className="mt-1.5 px-1 text-xs text-ink/45">
            {mode === 'regular' ? 'Para varios días o semanas.' : 'Para un cierre o un horario excepcional.'}
          </p>
        </div>

        <label className="block">
          <span className="field-label">{mode === 'regular' ? 'Fecha de inicio' : 'Día'}</span>
          <input
            type="date"
            value={date}
            onChange={(event) => loadDate(event.target.value)}
            className="field min-h-[50px] font-semibold"
          />
        </label>

        {mode === 'regular' ? (
          <>
            <div className="rounded-2xl border border-ink/[0.07] bg-white p-3">
              <div className="flex min-h-[44px] items-center justify-between gap-4">
                <div>
                  <strong className="text-sm text-ink">Cambio temporal</strong>
                  <p className="text-xs text-ink/45">Para verano u otro periodo con fecha final.</p>
                </div>
                <Switch
                  checked={temporary}
                  label="Activar cambio temporal"
                  onChange={(value) => mark(() => setTemporary(value))}
                />
              </div>
              {temporary && (
                <label className="mt-3 block border-t border-ink/[0.06] pt-3">
                  <span className="field-label">Fecha final</span>
                  <input
                    type="date"
                    min={date}
                    value={endDate}
                    onChange={(event) => mark(() => setEndDate(event.target.value))}
                    className="field min-h-[50px] font-semibold"
                  />
                  <span className="mt-1.5 block px-1 text-xs text-ink/45">
                    Sustituirá cualquier otro horario dentro de estas fechas.
                  </span>
                </label>
              )}
            </div>

            <div>
              <span className="field-label">Horario habitual</span>
              <div className="space-y-2">
                <HoursRow title="Lunes a viernes" group="weekday" hours={hours} setHours={(value) => mark(() => setHours(value))} />
                <HoursRow title="Sábado" group="saturday" hours={hours} setHours={(value) => mark(() => setHours(value))} />
                <HoursRow title="Domingo" group="sunday" hours={hours} setHours={(value) => mark(() => setHours(value))} />
              </div>
            </div>

            <p className="rounded-2xl bg-bronze/10 px-4 py-3 text-sm leading-relaxed text-ink/65">
              {regularSummary}
              {temporary && ' Durante esas fechas sustituirá otros horarios programados; después se retomará el que corresponda.'}
            </p>
          </>
        ) : (
          <>
            <div>
              <span className="field-label">Qué ocurrirá ese día</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={dayType === 'closed'}
                  onClick={() => mark(() => setDayType('closed'))}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 text-sm font-bold transition ${
                    dayType === 'closed'
                      ? 'border-terracotta bg-terracotta/10 text-terracotta'
                      : 'border-ink/[0.08] bg-white text-ink/60'
                  }`}
                >
                  <Lock size={20} /> Cerrar todo el día
                </button>
                <button
                  type="button"
                  aria-pressed={dayType === 'special'}
                  onClick={() => mark(() => setDayType('special'))}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 text-sm font-bold transition ${
                    dayType === 'special'
                      ? 'border-bronze bg-bronze/10 text-bronze-dark'
                      : 'border-ink/[0.08] bg-white text-ink/60'
                  }`}
                >
                  <Clock size={20} /> Cambiar horario
                </button>
              </div>
            </div>

            {dayType === 'special' && (
              <div>
                <span className="field-label">Horario de ese día</span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input type="time" value={dayOpen} onChange={(event) => mark(() => setDayOpen(event.target.value))} className={inputClass} aria-label="Apertura de ese día" />
                  <span className="text-ink/25">–</span>
                  <input type="time" value={dayClose} onChange={(event) => mark(() => setDayClose(event.target.value))} className={inputClass} aria-label="Cierre de ese día" />
                </div>
              </div>
            )}

            {dayType && (
              <label className="block">
                <span className="field-label">Motivo (opcional)</span>
                <input
                  value={reason}
                  onChange={(event) => mark(() => setReason(event.target.value))}
                  placeholder={dayType === 'closed' ? 'Ej. Festivo local' : 'Ej. Jornada especial'}
                  className="field"
                />
              </label>
            )}

            {dayException && (
              <button
                type="button"
                onClick={() => {
                  if (confirmRestore) restoreDay()
                  else setConfirmRestore(true)
                }}
                disabled={busy}
                className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-terracotta disabled:opacity-50 ${
                  confirmRestore ? 'bg-terracotta/[0.08]' : 'active:bg-terracotta/[0.06]'
                }`}
              >
                <Refresh size={17} />
                {confirmRestore ? 'Pulsa de nuevo para restaurar' : 'Restaurar horario habitual ese día'}
              </button>
            )}
          </>
        )}

        {error && <p role="alert" className="field-error !px-0">{error}</p>}
      </div>
    </Sheet>
  )
}
