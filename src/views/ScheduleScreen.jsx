import { useMemo, useState } from 'react'
import { listEmployees, listShifts, rangeTimeEntries, listTimeBands, getScheduleWeek } from '../lib/api'
import { useData } from '../lib/useData'
import { useSession } from '../state/session'
import { WeekStepper } from '../components/controls'
import { Tag, SkeletonList, EmptyState, Avatar } from '../components/ui'
import SectionCard from '../components/SectionCard'
import TimeBandGrid, { groupShiftsByBand } from './schedule/TimeBandGrid'
import { User, Lock, Alert } from '../components/icons'
import { weekBounds, monthBounds } from '../lib/date'
import { workedMinutesByEmployee, incompleteDaysByEmployee, fmtMinutes } from '../lib/hours'

// ============================================================================
// Horarios (VISUALIZACIÓN): cuadrante días × franjas del gym + horas trabajadas.
// La edición vive en su pantalla dedicada (admin: "+ → Editar horarios").
// ============================================================================
export default function ScheduleScreen({ editable = false }) {
  const { employee } = useSession()
  const [offset, setOffset] = useState(0)
  const week = useMemo(() => weekBounds(offset), [offset])
  const month = useMemo(() => monthBounds(0), [])

  const emp = useData(listEmployees, [])
  const bands = useData(listTimeBands, [])
  const shifts = useData(() => listShifts(week.startStr, week.endStr), [week.startStr])
  const weekEntries = useData(() => rangeTimeEntries(week.startStr, week.endStr), [week.startStr])
  const monthEntries = useData(() => rangeTimeEntries(month.startStr, month.endStr), [month.startStr])
  const schedWeek = useData(() => getScheduleWeek(week.startStr), [week.startStr], { interval: 0 })

  const staff = (emp.data || []).filter((e) => e.role !== 'admin')
  const empById = useMemo(() => new Map((emp.data || []).map((e) => [e.id, e])), [emp.data])
  const { byBand, extra } = useMemo(
    () => groupShiftsByBand(shifts.data || [], bands.data || []),
    [shifts.data, bands.data]
  )

  const weekWorked = useMemo(() => workedMinutesByEmployee(weekEntries.data || []), [weekEntries.data])
  const monthWorked = useMemo(() => workedMinutesByEmployee(monthEntries.data || []), [monthEntries.data])
  // Días pasados con fichaje de entrada sin salida: el total puede quedarse corto → avisar para corregir.
  const monthIncomplete = useMemo(() => incompleteDaysByEmployee(monthEntries.data || []), [monthEntries.data])

  const published = schedWeek.data?.status === 'published'
  const showSchedule = editable || employee.role === 'admin' || published
  const loading = emp.loading || shifts.loading || bands.loading

  // Horas: cada empleado ve solo las suyas; el admin ve todo el equipo.
  const isAdmin = employee.role === 'admin'
  const hoursStaff = isAdmin ? [...staff] : staff.filter((e) => e.id === employee.id)

  return (
    <div className="space-y-5 pb-24">
      <WeekStepper
        label={week.label}
        onPrev={() => setOffset((o) => o - 1)}
        onNext={() => setOffset((o) => o + 1)}
      >
        {showSchedule && published && (
          <div className="mt-0.5"><Tag status="published" /></div>
        )}
        {isAdmin && !published && (
          <div className="mt-0.5"><Tag status="draft" /></div>
        )}
      </WeekStepper>

      {loading ? (
        <SkeletonList rows={6} />
      ) : !showSchedule ? (
        <EmptyState icon={Lock} title="Horario no publicado" subtitle="El horario de esta semana aún no está disponible. Te avisaremos cuando se publique." />
      ) : (
        <>
          <TimeBandGrid
            bands={bands.data || []}
            days={week.days}
            byBand={byBand}
            extra={extra}
            empById={empById}
            employee={employee}
          />
          <p className="-mt-2 px-1 text-xs text-ink/40">Desliza a los lados para ver más días.</p>
        </>
      )}

      {/* Horas trabajadas (privadas por empleado) */}
      <SectionCard icon={User} title={isAdmin ? 'Horas trabajadas del equipo' : 'Mis horas trabajadas'} persistKey="b13.horario.horas">
        {hoursStaff
            .map((e) => ({ e, w: weekWorked.get(e.id) || 0, m: monthWorked.get(e.id) || 0 }))
            .sort((a, b) => b.w - a.w)
            .map(({ e, w, m }, i) => {
              const isMe = e.id === employee.id
              return (
                <div key={e.id} className={`flex animate-rise-in items-center gap-3 p-3 ${isMe ? 'bg-bronze/[0.05]' : ''}`} style={{ animationDelay: `${i * 35}ms` }}>
                  <Avatar emp={e} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{e.name}{isMe && <span className="ml-1 text-xs font-bold text-bronze-dark">· tú</span>}</p>
                    <p className="text-xs text-ink/40">Mes: <span className="tabular">{fmtMinutes(m)}</span></p>
                    {monthIncomplete.get(e.id) > 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-terracotta">
                        <Alert size={11} /> {monthIncomplete.get(e.id)} día(s) sin fichar salida · revisar
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold text-ink tabular">{fmtMinutes(w)}</p>
                    <p className="text-[10px] text-ink/40">esta semana</p>
                  </div>
                </div>
              )
            })}
        <p className="px-4 py-2.5 text-xs text-ink/40">Calculado de los fichajes (descontando pausas y comidas).</p>
      </SectionCard>
    </div>
  )
}
