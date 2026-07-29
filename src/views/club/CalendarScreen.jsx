import { useMemo, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import Sheet from '../../components/Sheet'
import { Button, WeekStepper } from '../../components/controls'
import { Card, SkeletonList } from '../../components/ui'
import { useData } from '../../lib/useData'
import { listCalendarEvents, listClubSchedules } from '../../lib/api'
import { isTodayStr, monthBounds, parseDate, todayMadrid } from '../../lib/date'
import {
  Calendar,
  Clock,
  Lock,
  Pencil,
  Plus,
  Star,
} from '../../components/icons'
import CalendarEventSheet from './CalendarEventSheet'
import CalendarScheduleSheet from './CalendarScheduleSheet'
import {
  calendarEntryType,
  dayHours,
  eventsForDay,
  formatAgendaDate,
  formatFullDate,
  hm,
  monthAgenda,
  scheduleExceptionForDay,
  scheduleSegmentsForMonth,
  scheduleSummary,
} from './calendarModel'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function dateInMonth(date, month) {
  return date >= month.startStr && date <= month.endStr
}

function segmentLabel(segment, month) {
  if (segment.start === month.startStr && segment.end === month.endStr) return null
  const start = parseDate(segment.start).getDate()
  const end = parseDate(segment.end).getDate()
  if (segment.start === month.startStr) return `Hasta el ${end}`
  if (segment.end === month.endStr) return `Desde el ${start}`
  return `Del ${start} al ${end}`
}

function HoursValue({ value }) {
  const closed = value === 'Cerrado'
  return (
    <span className={`block text-sm font-extrabold tabular ${closed ? 'text-terracotta' : 'text-ink'}`}>
      {closed ? 'cerrado' : value.replaceAll(':00', '')}
    </span>
  )
}

function SchedulePeriod({ segment, month }) {
  const summary = scheduleSummary(segment.schedule)
  const label = segmentLabel(segment, month)
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-[11px] font-extrabold uppercase text-bronze-dark">{label}</p>
      )}
      <div className="grid grid-cols-3 divide-x divide-ink/[0.06] overflow-hidden rounded-xl border border-ink/[0.07] bg-sand-25">
        {[
          ['L–V', summary.weekday],
          ['Sáb', summary.saturday],
          ['Dom', summary.sunday],
        ].map(([day, value]) => (
          <div key={day} className="min-w-0 px-2 py-2.5 text-center">
            <span className="block text-[11px] font-extrabold uppercase text-ink/45">{day}</span>
            <HoursValue value={value} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleCard({ schedules, month }) {
  const segments = scheduleSegmentsForMonth(schedules, month.days)
  return (
    <Card className="p-4" aria-labelledby="club-schedule-title">
      <h2 id="club-schedule-title" className="font-display text-card font-extrabold text-ink">
        Horario de {month.label.split(' ')[0].toLowerCase()}
      </h2>
      {segments.length ? (
        <div className="mt-3 space-y-3">
          {segments.map((segment) => (
            <SchedulePeriod key={`${segment.start}-${segment.end}`} segment={segment} month={month} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink/45">Todavía no hay un horario habitual configurado.</p>
      )}
    </Card>
  )
}

function AgendaRow({ entry, isAdmin, onClick }) {
  const isSchedule = calendarEntryType(entry) === 'schedule'
  const closed = isSchedule && entry.kind === 'cerrado'
  const Icon = isSchedule ? closed ? Lock : Clock : Star
  const subtitle = isSchedule
    ? `Horario · ${closed ? 'Cerrado' : `${hm(entry.open_time)}–${hm(entry.close_time)}`}`
    : `Evento${entry.event_time ? ` · ${hm(entry.event_time)}` : ''}`
  const content = (
    <div className="flex min-h-[68px] items-center gap-3 px-3 py-2.5 text-left">
      <div className="w-11 shrink-0 text-center">
        <span className="block text-[11px] font-bold uppercase text-ink/40">
          {formatAgendaDate(entry.event_date).split(' ')[0]}
        </span>
        <strong className="block font-display text-xl leading-none text-ink">
          {parseDate(entry.event_date).getDate()}
        </strong>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        isSchedule ? closed ? 'bg-terracotta/10 text-terracotta' : 'bg-ochre/15 text-[#8a6a1e]' : 'bg-bronze/12 text-bronze-dark'
      }`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block break-words text-sm leading-snug text-ink">{entry.title}</strong>
        <span className="mt-0.5 block text-xs font-semibold text-ink/45">{subtitle}</span>
      </span>
      {isAdmin && <Pencil size={16} className="shrink-0 text-ink/25" />}
    </div>
  )

  return isAdmin ? (
    <button type="button" onClick={onClick} className="w-full active:bg-ink/[0.03]">
      {content}
    </button>
  ) : content
}

function DaySheet({
  open,
  date,
  schedules,
  entries,
  isAdmin,
  onClose,
  onEditSchedule,
  onAddEvent,
  onEditEvent,
}) {
  if (!date) return null
  const hours = dayHours(schedules, entries, date)
  const exception = scheduleExceptionForDay(entries, date)
  const events = eventsForDay(entries, date)
  return (
    <Sheet open={open} onClose={onClose} title={formatFullDate(date)} maxH="82vh">
      <div className="space-y-4 pb-2">
        <div className={`rounded-2xl p-4 ${hours.closed ? 'bg-terracotta/[0.08]' : 'bg-bronze/10'}`}>
          <span className="text-xs font-bold uppercase text-ink/45">Horario del gimnasio</span>
          <p className={`mt-1 font-display text-2xl font-extrabold tabular ${
            hours.closed ? 'text-terracotta' : 'text-ink'
          }`}>
            {hours.label}
          </p>
          {exception?.note && <p className="mt-1 text-sm text-ink/55">{exception.note}</p>}
        </div>

        <div>
          <h3 className="field-label">En el calendario</h3>
          {events.length ? (
            <div className="divide-y divide-ink/[0.06] overflow-hidden rounded-2xl border border-ink/[0.07] bg-white">
              {events.map((entry) => (
                <AgendaRow
                  key={entry.id}
                  entry={entry}
                  isAdmin={isAdmin}
                  onClick={() => onEditEvent(entry)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-ink/[0.07] bg-white px-4 py-3 text-sm text-ink/45">
              No hay eventos para este día.
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" size="sm" icon={Clock} onClick={onEditSchedule}>
              Cambiar horario
            </Button>
            <Button size="sm" icon={Plus} onClick={onAddEvent}>
              Añadir evento
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export default function CalendarScreen({ employee, onClose }) {
  const isAdmin = employee?.role === 'admin'
  const [offset, setOffset] = useState(0)
  const month = useMemo(() => monthBounds(offset), [offset])
  const events = useData(() => listCalendarEvents(month.startStr, month.endStr), [month.startStr])
  const schedules = useData(listClubSchedules, [])
  const [scheduleEditor, setScheduleEditor] = useState(null)
  const [eventEditor, setEventEditor] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const monthEntries = events.data || []
  const monthSchedules = schedules.data || []
  const agenda = monthAgenda(monthEntries)
  const calendarUnavailable = events.loading || schedules.loading || events.error || schedules.error
  const firstDow = (parseDate(month.days[0]).getDay() + 6) % 7
  const blanks = Array.from({ length: firstDow })
  const defaultDate = dateInMonth(todayMadrid(), month) ? todayMadrid() : month.startStr

  async function reloadAll() {
    await Promise.all([events.reload(true), schedules.reload(true)])
  }

  function openSchedule(date = defaultDate, mode = 'regular') {
    setSelectedDay(null)
    setScheduleEditor({ date, mode })
  }

  function openEvent(date = defaultDate, entry = null) {
    setSelectedDay(null)
    setEventEditor({ date, entry })
  }

  return (
    <OverlayScreen title="Calendario del club" onClose={onClose}>
      <div className="space-y-4 pb-6">
        <WeekStepper
          label={month.label}
          onPrev={() => { setOffset((current) => current - 1); setSelectedDay(null) }}
          onNext={() => { setOffset((current) => current + 1); setSelectedDay(null) }}
        />

        {isAdmin && (
          <div aria-label="Acciones del calendario" className="grid grid-cols-2 gap-2 rounded-xl2 border border-ink/[0.07] bg-white p-2 shadow-card">
            <Button variant="secondary" size="sm" icon={Pencil} full disabled={calendarUnavailable} onClick={() => openSchedule()}>
              Editar horario
            </Button>
            <Button size="sm" icon={Plus} full disabled={calendarUnavailable} onClick={() => openEvent()}>
              Añadir evento
            </Button>
          </div>
        )}

        {events.loading || schedules.loading ? (
          <SkeletonList rows={4} />
        ) : events.error || schedules.error ? (
          <Card className="p-4 text-sm text-terracotta">
            No se pudo cargar el calendario. Comprueba la conexión e inténtalo de nuevo.
          </Card>
        ) : (
          <>
            <ScheduleCard schedules={monthSchedules} month={month} />

            <Card className="overflow-hidden p-3" aria-label="Calendario mensual">
              <div className="mb-1 grid grid-cols-7">
                {DOW.map((day) => (
                  <span key={day} className="py-1 text-center text-[11px] font-extrabold text-ink/40">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, index) => <span key={`blank-${index}`} />)}
                {month.days.map((date) => {
                  const hours = dayHours(monthSchedules, monthEntries, date)
                  const exception = scheduleExceptionForDay(monthEntries, date)
                  const dayEvents = eventsForDay(monthEntries, date)
                  const today = isTodayStr(date)
                  const dateLabel = formatFullDate(date)
                  const eventLabel = dayEvents.length
                    ? `. ${dayEvents.map((entry) => entry.title).join(', ')}`
                    : ''
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      aria-label={`${dateLabel}. Horario ${hours.label}${eventLabel}`}
                      className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-xl px-0.5 transition active:scale-95 ${
                        exception?.kind === 'cerrado'
                          ? 'bg-terracotta/[0.07]'
                          : exception?.kind === 'especial'
                            ? 'bg-ochre/[0.08]'
                            : today ? 'ring-1 ring-inset ring-bronze/50' : ''
                      }`}
                    >
                      <span className={`text-sm font-bold tabular ${today ? 'text-bronze-dark' : 'text-ink/80'}`}>
                        {parseDate(date).getDate()}
                      </span>
                      {exception && (
                        <span className={`mt-1 max-w-full text-[11px] font-extrabold leading-none tabular ${
                          exception.kind === 'cerrado' ? 'text-terracotta' : 'text-[#8a6a1e]'
                        }`}>
                          {exception.kind === 'cerrado' ? 'Cerrado' : `${hm(exception.open_time)}–${hm(exception.close_time)}`.replaceAll(':00', '')}
                        </span>
                      )}
                      {dayEvents.length > 0 && (
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-bronze" aria-hidden="true" />
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            <section aria-labelledby="month-agenda-title">
              <h2 id="month-agenda-title" className="mb-2 px-1 text-[11px] font-extrabold uppercase text-ink/45">
                Este mes · {month.label.split(' ')[0].toLowerCase()}
              </h2>
              {agenda.length ? (
                <Card className="divide-y divide-ink/[0.06] overflow-hidden">
                  {agenda.map((entry) => (
                    <AgendaRow
                      key={entry.id}
                      entry={entry}
                      isAdmin={isAdmin}
                      onClick={() => {
                        if (calendarEntryType(entry) === 'schedule') {
                          openSchedule(entry.event_date, 'day')
                        } else {
                          openEvent(entry.event_date, entry)
                        }
                      }}
                    />
                  ))}
                </Card>
              ) : (
                <Card className="p-4 text-sm text-ink/45">
                  No hay cambios de horario ni eventos este mes.
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      <DaySheet
        open={Boolean(selectedDay)}
        date={selectedDay}
        schedules={monthSchedules}
        entries={monthEntries}
        isAdmin={isAdmin}
        onClose={() => setSelectedDay(null)}
        onEditSchedule={() => openSchedule(selectedDay, 'day')}
        onAddEvent={() => openEvent(selectedDay)}
        onEditEvent={(entry) => openEvent(entry.event_date, entry)}
      />

      <CalendarScheduleSheet
        open={Boolean(scheduleEditor)}
        initialDate={scheduleEditor?.date || defaultDate}
        initialMode={scheduleEditor?.mode || 'regular'}
        schedules={monthSchedules}
        entries={monthEntries}
        onClose={() => setScheduleEditor(null)}
        onSaved={reloadAll}
      />

      <CalendarEventSheet
        open={Boolean(eventEditor)}
        date={eventEditor?.date || defaultDate}
        editing={eventEditor?.entry || null}
        onClose={() => setEventEditor(null)}
        onSaved={reloadAll}
      />
    </OverlayScreen>
  )
}
