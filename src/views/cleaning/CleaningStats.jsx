import { useMemo, useState } from 'react'
import { listEmployees, listTemplates, rangeCompletions, rangeAdHoc, rangeTimeEntries } from '../../lib/api'
import { useData } from '../../lib/useData'
import { Card, ProgressRing, SkeletonList, EmptyState, Avatar } from '../../components/ui'
import SectionCard from '../../components/SectionCard'
import { WeekStepper } from '../../components/controls'
import { Activity, Spray, Check, Clock, User, Chevron, Refresh } from '../../components/icons'
import { dayBounds, weekBounds, monthBounds, weekdayOf, dowLabel, timeHM, isTodayStr, todayMadrid } from '../../lib/date'
import { workedMinutesByEmployee, fmtMinutes } from '../../lib/hours'

const PERIODS = [
  { key: 'day', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
]
const applies = (weekdays, dow) => !weekdays || weekdays.length === 0 || weekdays.includes(dow)

export default function CleaningStats() {
  const [period, setPeriod] = useState('week')
  const [offset, setOffset] = useState(0)

  const range = useMemo(() => {
    if (period === 'day') return dayBounds(offset)
    if (period === 'week') return weekBounds(-offset)
    return monthBounds(-offset)
  }, [period, offset])

  const emp = useData(listEmployees, [])
  const ctpl = useData(() => listTemplates('cleaning'), [])
  const comps = useData(() => rangeCompletions(range.startStr, range.endStr), [range.startStr, range.endStr])
  const adhoc = useData(() => rangeAdHoc('cleaning', range.startStr, range.endStr), [range.startStr, range.endStr])
  const entries = useData(() => rangeTimeEntries(range.startStr, range.endStr), [range.startStr, range.endStr])

  const loading = emp.loading || ctpl.loading || comps.loading

  const data = useMemo(() => {
    const cleaners = (emp.data || []).filter((e) => e.role === 'cleaning')
    const cleanerIds = new Set(cleaners.map((e) => e.id))
    const onceTpl = (ctpl.data || []).filter((t) => t.recurrence === 'once')
    const tplById = new Map((ctpl.data || []).map((t) => [t.id, t]))
    const cleanComps = (comps.data || []).filter((c) => c.role === 'cleaning')

    // Cumplimiento por día
    const perDay = range.days.map((d) => {
      const dow = weekdayOf(d)
      const expected = onceTpl.filter((t) => applies(t.weekdays, dow)).length
      const doneIds = new Set(cleanComps.filter((c) => c.work_date === d && c.template_id).map((c) => c.template_id))
      const future = d > todayMadrid()
      return { date: d, expected, done: doneIds.size, ratio: expected ? Math.min(1, doneIds.size / expected) : 0, future }
    })
    const relevant = perDay.filter((d) => !d.future && d.expected > 0)
    const avg = relevant.length ? relevant.reduce((s, d) => s + d.ratio, 0) / relevant.length : 0

    // Detalle del día (solo period=day)
    const dayDetail = onceTpl
      .filter((t) => applies(t.weekdays, weekdayOf(range.startStr)))
      .map((t) => {
        const c = cleanComps.find((x) => x.work_date === range.startStr && x.template_id === t.id)
        return { id: t.id, title: t.title, category: t.category, done: !!c, by: c?.employee_name, at: c?.completed_at }
      })

    // Avisos urgentes / puntuales
    const adRange = adhoc.data || []
    const adDone = adRange.filter((a) => a.status === 'done').length
    const adPending = adRange.filter((a) => a.status === 'pending').length

    // Ranking por empleada (tareas + horas)
    const worked = workedMinutesByEmployee((entries.data || []).filter((e) => cleanerIds.has(e.employee_id)))
    const byName = new Map()
    for (const c of cleanComps) { if (c.employee_name) byName.set(c.employee_name, (byName.get(c.employee_name) || 0) + 1) }
    const ranking = cleaners
      .map((e) => ({ e, tasks: byName.get(e.name) || 0, min: worked.get(e.id) || 0 }))
      .sort((a, b) => b.tasks - a.tasks)

    const totalMin = [...worked.values()].reduce((s, m) => s + m, 0)
    return { perDay, avg, dayDetail, totalTasks: cleanComps.length, adDone, adPending, ranking, totalMin }
  }, [emp.data, ctpl.data, comps.data, adhoc.data, entries.data, range])

  const maxBar = 80

  return (
    <div className="space-y-5 pb-24">
      {/* Selector de periodo */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => { setPeriod(p.key); setOffset(0) }}
            className={`min-h-[44px] flex-1 rounded-2xl text-sm font-bold transition active:scale-95 ${period === p.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/55'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Navegación de periodo (stepper estándar; aquí offset+1 = anterior) */}
      <WeekStepper
        label={range.label}
        onPrev={() => setOffset((o) => o + 1)}
        onNext={() => setOffset((o) => Math.max(0, o - 1))}
        nextDisabled={offset === 0}
      />

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex items-center gap-3 p-4">
              <ProgressRing value={data.avg} size={56} color="#5B7A8C"><span className="tabular font-display text-sm font-extrabold">{Math.round(data.avg * 100)}%</span></ProgressRing>
              <div><p className="font-display text-lg font-bold leading-tight">Cumplimiento</p><p className="text-xs text-ink/45">de la ruta</p></div>
            </Card>
            <Card className="p-4">
              <p className="font-display text-3xl font-extrabold text-ink tabular">{data.totalTasks}</p>
              <p className="text-sm text-ink/50">tareas hechas</p>
            </Card>
            <Card className="p-4">
              <p className="font-display text-3xl font-extrabold text-terracotta tabular">{data.adDone}</p>
              <p className="text-sm text-ink/50">avisos atendidos{data.adPending > 0 && <span className="text-ochre"> · {data.adPending} sin hacer</span>}</p>
            </Card>
            <Card className="p-4">
              <p className="font-display text-3xl font-extrabold text-stone tabular">{fmtMinutes(data.totalMin)}</p>
              <p className="text-sm text-ink/50">horas del equipo</p>
            </Card>
          </div>

          {/* Día: detalle de la ruta; Semana/Mes: barras por día */}
          {period === 'day' ? (
            <SectionCard icon={Spray} title="Ruta del día" persistKey="b13.cleanstats.ruta">
              {data.dayDetail.length === 0 ? (
                <div className="p-3"><EmptyState icon={Spray} title="Sin ruta" subtitle="No había tareas programadas." /></div>
              ) : (
                data.dayDetail.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${t.done ? 'bg-sage text-white' : 'border-2 border-ink/15'}`}>
                        {t.done && <Check size={14} strokeWidth={3} />}
                      </span>
                      <p className={`flex-1 text-sm font-medium ${t.done ? 'text-ink/40 line-through' : 'text-ink'}`}>{t.title}</p>
                      {t.done ? (
                        <span className="flex items-center gap-1 text-xs text-sage"><User size={11} />{t.by?.split(' ')[0]} · {timeHM(t.at)}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-ink/35"><Clock size={11} />falta</span>
                      )}
                    </div>
                ))
              )}
            </SectionCard>
          ) : (
            <SectionCard icon={Activity} title="Cumplimiento por día" persistKey="b13.cleanstats.perday">
              <div className="p-4">
                <div className="flex items-end justify-between gap-1" style={{ height: maxBar + 20 }}>
                  {data.perDay.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div className={`w-full max-w-[18px] rounded ${d.future ? 'bg-ink/8' : d.ratio >= 0.999 ? 'bg-sage' : d.ratio >= 0.5 ? 'bg-stone' : 'bg-ochre'}`}
                          style={{ height: Math.max(4, d.ratio * maxBar) }} title={`${d.done}/${d.expected}`} />
                      </div>
                      {range.days.length <= 7 && <span className={`text-[10px] font-bold ${isTodayStr(d.date) ? 'text-ink' : 'text-ink/35'}`}>{dowLabel(d.date)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Ranking por empleada */}
          <SectionCard icon={User} title="Trabajo por empleada" persistKey="b13.cleanstats.ranking">
            {data.ranking.map(({ e, tasks, min }, i) => (
                <div key={e.id} className="flex animate-rise-in items-center gap-3 p-3" style={{ animationDelay: `${i * 35}ms` }}>
                  <span className="w-4 text-center font-display text-base font-extrabold text-ink/30">{i + 1}</span>
                  <Avatar emp={e} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{e.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink/40"><Clock size={11} /> <span className="tabular">{fmtMinutes(min)}</span> trabajadas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold text-ink tabular">{tasks}</p>
                    <p className="text-[10px] text-ink/40">tareas</p>
                  </div>
                </div>
            ))}
          </SectionCard>
        </>
      )}
    </div>
  )
}
