import { useMemo, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { WeekStepper } from '../../components/controls'
import { Card, SkeletonList } from '../../components/ui'
import { useData } from '../../lib/useData'
import { listCalendarEvents } from '../../lib/api'
import { monthBounds, parseDate, isTodayStr } from '../../lib/date'
import { Star, Clock, Lock, Plus, Pencil } from '../../components/icons'
import CalendarEventSheet, { KINDS } from './CalendarEventSheet'

// Estilo visual por tipo de día (coherente con la paleta de estados).
const KIND_META = {
  festivo:  { icon: Star,  dot: 'bg-bronze',     chip: 'bg-bronze/12 text-bronze-dark', cell: 'bg-bronze/[0.06]' },
  especial: { icon: Clock, dot: 'bg-ochre',      chip: 'bg-ochre/15 text-[#8a6a1e]',    cell: 'bg-ochre/[0.07]' },
  cerrado:  { icon: Lock,  dot: 'bg-terracotta', chip: 'bg-terracotta/12 text-terracotta', cell: 'bg-terracotta/[0.06]' },
}
const kindLabel = (k) => KINDS.find((x) => x.key === k)?.label || k
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function hm(t) { return t ? t.slice(0, 5) : '' }

// ============================================================================
// Calendario anual del gimnasio (desde Club): festividades, horarios especiales
// y cierres, con vista MENSUAL navegable. Todos consultan; el admin edita.
// ============================================================================
export default function CalendarScreen({ employee, onClose }) {
  const isAdmin = employee?.role === 'admin'
  const [offset, setOffset] = useState(0)
  const month = useMemo(() => monthBounds(offset), [offset])
  const [selected, setSelected] = useState(null)     // 'YYYY-MM-DD' del día tocado
  const [editing, setEditing] = useState(null)       // { date, event } para el sheet
  const [sheetOpen, setSheetOpen] = useState(false)

  const events = useData(() => listCalendarEvents(month.startStr, month.endStr), [month.startStr])

  // Eventos por día del mes visible.
  const byDay = useMemo(() => {
    const m = {}
    for (const e of events.data || []) (m[e.event_date] ||= []).push(e)
    return m
  }, [events.data])

  // Relleno inicial para alinear el día 1 con su columna (semana empieza en lunes).
  const firstDow = (parseDate(month.days[0]).getDay() + 6) % 7 // 0=lunes
  const blanks = Array.from({ length: firstDow })

  const monthEvents = (events.data || [])
  const selectedEvents = selected ? (byDay[selected] || []) : []

  function openNew(date) { setEditing({ date, event: null }); setSheetOpen(true) }
  function openEdit(ev) { setEditing({ date: ev.event_date, event: ev }); setSheetOpen(true) }

  return (
    <OverlayScreen title="Calendario anual" onClose={onClose}>
      <div className="space-y-4 pb-6">
        <WeekStepper
          label={month.label}
          onPrev={() => { setOffset((o) => o - 1); setSelected(null) }}
          onNext={() => { setOffset((o) => o + 1); setSelected(null) }}
        />

        {events.loading ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            {/* Cuadrícula del mes */}
            <Card className="overflow-hidden p-3">
              <div className="mb-1 grid grid-cols-7">
                {DOW.map((d) => (
                  <span key={d} className="py-1 text-center text-[11px] font-bold text-ink/35">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, i) => <span key={`b${i}`} />)}
                {month.days.map((d) => {
                  const evs = byDay[d] || []
                  const top = evs[0]
                  const meta = top ? KIND_META[top.kind] : null
                  const today = isTodayStr(d)
                  const on = selected === d
                  return (
                    <button
                      key={d}
                      onClick={() => setSelected(on ? null : d)}
                      className={`relative flex min-h-[44px] flex-col items-center justify-center rounded-xl text-sm transition active:scale-95 ${
                        on ? 'bg-ink text-white' : meta ? meta.cell : ''
                      } ${today && !on ? 'ring-1 ring-inset ring-bronze/50' : ''}`}
                    >
                      <span className={`tabular font-semibold ${on ? 'text-white' : today ? 'text-bronze-dark' : 'text-ink/80'}`}>
                        {parseDate(d).getDate()}
                      </span>
                      {evs.length > 0 && (
                        <span className="mt-0.5 flex gap-0.5">
                          {evs.slice(0, 3).map((e, i) => (
                            <span key={i} className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-white/80' : KIND_META[e.kind].dot}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Leyenda discreta (info, no interactiva) */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
              {KINDS.map((k) => (
                <span key={k.key} className="flex items-center gap-1.5 text-xs text-ink/45">
                  <span className={`h-2 w-2 rounded-full ${KIND_META[k.key].dot}`} /> {k.label}
                </span>
              ))}
            </div>

            {/* Detalle del día seleccionado (si tiene eventos o el admin va a añadir) */}
            {selected && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <p className="flex-1 font-display text-card font-bold capitalize text-ink">
                    {parseDate(selected).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {isAdmin && (
                    <button onClick={() => openNew(selected)} className="flex min-h-[44px] items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-bold text-white active:scale-95">
                      <Plus size={14} /> Añadir
                    </button>
                  )}
                </div>
                {selectedEvents.length === 0 ? (
                  <p className="border-t border-ink/[0.06] px-4 py-3 text-sm text-ink/40">
                    Día normal · horario habitual del gimnasio.
                  </p>
                ) : (
                  <div className="divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
                    {selectedEvents.map((ev) => <EventRow key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={() => openEdit(ev)} />)}
                  </div>
                )}
              </Card>
            )}

            {/* Resumen del mes: todos los días especiales en lista (escaneo rápido) */}
            <div>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Días especiales del mes</p>
              {monthEvents.length === 0 ? (
                <Card className="p-4 text-sm text-ink/40">Ningún día especial este mes. Horario habitual todos los días.</Card>
              ) : (
                <Card className="divide-y divide-ink/[0.06] overflow-hidden">
                  {monthEvents.map((ev) => (
                    <EventRow key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={() => openEdit(ev)} showDate />
                  ))}
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <CalendarEventSheet
        open={sheetOpen}
        date={editing?.date}
        editing={editing?.event}
        onClose={() => setSheetOpen(false)}
        onSaved={() => events.reload(true)}
      />
    </OverlayScreen>
  )
}

// Fila de un día especial: icono tonal + nombre + horario/nota; el admin la edita.
function EventRow({ ev, isAdmin, onEdit, showDate = false }) {
  const meta = KIND_META[ev.kind] || KIND_META.festivo
  const Icon = meta.icon
  const row = (
    <div className="flex items-center gap-3 px-4 py-3 text-left">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{ev.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink/45">
          {showDate && <span className="font-semibold text-ink/55 capitalize">{parseDate(ev.event_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span>}
          <span className="font-semibold" style={{ color: 'inherit' }}>{kindLabel(ev.kind)}</span>
          {ev.kind === 'especial' && ev.open_time && <span className="tabular">{hm(ev.open_time)}–{hm(ev.close_time)}</span>}
          {ev.note && <span className="truncate">· {ev.note}</span>}
        </p>
      </div>
      {isAdmin && <Pencil size={16} className="shrink-0 text-ink/30" />}
    </div>
  )
  return isAdmin ? (
    <button onClick={onEdit} className="w-full transition active:bg-ink/[0.03]">{row}</button>
  ) : row
}
