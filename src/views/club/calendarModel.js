import { parseDate } from '../../lib/date.js'

const pad = (value) => String(value).padStart(2, '0')

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDaysKey(key, amount) {
  const date = parseDate(key)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function calendarEntryType(entry) {
  if (entry.entry_type) return entry.entry_type
  return entry.kind === 'festivo' ? 'event' : 'schedule'
}

export function scheduleForDay(schedules, key) {
  return [...(schedules || [])]
    .filter((schedule) => (
      schedule.start_date <= key &&
      (!schedule.end_date || schedule.end_date >= key)
    ))
    .sort((a, b) => {
      const temporary = Number(Boolean(b.end_date)) - Number(Boolean(a.end_date))
      if (temporary) return temporary
      if (a.end_date && b.end_date) {
        const updated = String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
        if (updated) return updated
      }
      return b.start_date.localeCompare(a.start_date)
    })[0] || null
}

export function scheduleExceptionForDay(entries, key) {
  return [...(entries || [])]
    .filter((entry) => entry.event_date === key && calendarEntryType(entry) === 'schedule')
    .sort((a, b) => {
      const created = String(b.created_at || '').localeCompare(String(a.created_at || ''))
      return created || String(b.id || '').localeCompare(String(a.id || ''))
    })[0] || null
}

export function eventsForDay(entries, key) {
  return (entries || []).filter((entry) => (
    entry.event_date === key && calendarEntryType(entry) === 'event'
  ))
}

export function dayHours(schedules, entries, key) {
  const exception = scheduleExceptionForDay(entries, key)
  if (exception?.kind === 'cerrado') return { closed: true, label: 'Cerrado' }
  if (exception?.kind === 'especial') {
    return {
      closed: false,
      label: `${hm(exception.open_time)}–${hm(exception.close_time)}`,
      exception: true,
    }
  }

  const schedule = scheduleForDay(schedules, key)
  if (!schedule) return { closed: false, label: 'Sin horario' }
  const day = parseDate(key).getDay()
  if (day === 0) {
    return schedule.sunday_closed
      ? { closed: true, label: 'Cerrado' }
      : { closed: false, label: `${hm(schedule.sunday_open)}–${hm(schedule.sunday_close)}` }
  }
  if (day === 6) {
    return schedule.saturday_closed
      ? { closed: true, label: 'Cerrado' }
      : { closed: false, label: `${hm(schedule.saturday_open)}–${hm(schedule.saturday_close)}` }
  }
  return schedule.weekday_closed
    ? { closed: true, label: 'Cerrado' }
    : { closed: false, label: `${hm(schedule.weekday_open)}–${hm(schedule.weekday_close)}` }
}

function scheduleSignature(schedule) {
  if (!schedule) return 'none'
  return [
    schedule.weekday_closed, hm(schedule.weekday_open), hm(schedule.weekday_close),
    schedule.saturday_closed, hm(schedule.saturday_open), hm(schedule.saturday_close),
    schedule.sunday_closed, hm(schedule.sunday_open), hm(schedule.sunday_close),
  ].join('|')
}

export function scheduleSegmentsForMonth(schedules, days) {
  const segments = []
  for (const key of days || []) {
    const schedule = scheduleForDay(schedules, key)
    const signature = scheduleSignature(schedule)
    const previous = segments[segments.length - 1]
    if (previous?.signature === signature) {
      previous.end = key
    } else {
      segments.push({ start: key, end: key, schedule, signature })
    }
  }
  return segments
}

export function monthAgenda(entries) {
  return [...(entries || [])].sort((a, b) => {
    const date = a.event_date.localeCompare(b.event_date)
    if (date) return date
    if (calendarEntryType(a) !== calendarEntryType(b)) {
      return calendarEntryType(a) === 'schedule' ? -1 : 1
    }
    return String(a.event_time || '').localeCompare(String(b.event_time || ''))
  })
}

export function hm(value) {
  return value ? value.slice(0, 5) : ''
}

export function scheduleSummary(schedule) {
  if (!schedule) return { weekday: 'Sin horario', saturday: 'Sin horario', sunday: 'Sin horario' }
  return {
    weekday: schedule.weekday_closed ? 'Cerrado' : `${hm(schedule.weekday_open)}–${hm(schedule.weekday_close)}`,
    saturday: schedule.saturday_closed ? 'Cerrado' : `${hm(schedule.saturday_open)}–${hm(schedule.saturday_close)}`,
    sunday: schedule.sunday_closed ? 'Cerrado' : `${hm(schedule.sunday_open)}–${hm(schedule.sunday_close)}`,
  }
}

export function formatFullDate(key) {
  return parseDate(key).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatAgendaDate(key) {
  return parseDate(key).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}
