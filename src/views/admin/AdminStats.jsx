import { useMemo } from 'react'
import {
  listEmployees, listAllTemplates, rangeCompletions, rangeTimeEntries, listIncidencias, listMaintenance,
} from '../../lib/api'
import { useData } from '../../lib/useData'
import { Card, ProgressRing, Spinner, CountBadge, Avatar } from '../../components/ui'
import SectionCard from '../../components/SectionCard'
import { Activity, Refresh, Alert, Clock, Check, User } from '../../components/icons'
import { weekBounds, weekdayOf, isTodayStr, dowLabel, todayMadrid } from '../../lib/date'
import { workedMinutesByEmployee, fmtMinutes } from '../../lib/hours'

const applies = (weekdays, dow) => !weekdays || weekdays.length === 0 || weekdays.includes(dow)

export default function AdminStats() {
  const week = useMemo(() => weekBounds(0), [])
  const emp = useData(listEmployees, [])
  const tpls = useData(listAllTemplates, [])
  const comps = useData(() => rangeCompletions(week.startStr, week.endStr), [week.startStr])
  const entries = useData(() => rangeTimeEntries(week.startStr, week.endStr), [week.startStr])
  const incid = useData(listIncidencias, [])
  const maint = useData(listMaintenance, [])

  const loading = emp.loading || tpls.loading || comps.loading

  const data = useMemo(() => {
    const templates = (tpls.data || []).filter((t) => t.active && (t.role === 'coach' || t.role === 'cleaning'))
    const onceTpl = templates.filter((t) => t.recurrence === 'once')
    const tplById = new Map(templates.map((t) => [t.id, t]))
    const completions = comps.data || []

    // Por día de la semana: esperadas (once que aplican) vs hechas (once completadas distintas)
    const perDay = week.days.map((d) => {
      const dow = weekdayOf(d)
      const expected = onceTpl.filter((t) => applies(t.weekdays, dow)).length
      const doneIds = new Set(
        completions
          .filter((c) => c.work_date === d && c.template_id && tplById.get(c.template_id)?.recurrence === 'once')
          .map((c) => c.template_id)
      )
      const done = doneIds.size
      const future = d > todayMadrid()
      return { date: d, expected, done, ratio: expected ? Math.min(1, done / expected) : 0, future, today: isTodayStr(d) }
    })

    const onceDone = completions.filter((c) => c.template_id && tplById.get(c.template_id)?.recurrence === 'once').length
    const recurringDone = completions.filter((c) => c.template_id && tplById.get(c.template_id)?.recurrence === 'recurring').length

    // Pendiente HOY (once que aplican hoy y no se han hecho)
    const today = todayMadrid()
    const dowToday = weekdayOf(today)
    const doneTodayIds = new Set(completions.filter((c) => c.work_date === today && c.template_id).map((c) => c.template_id))
    const pendingToday = onceTpl.filter((t) => applies(t.weekdays, dowToday) && !doneTodayIds.has(t.id))

    // Ranking por empleado (nº de marcas esta semana)
    const byEmp = new Map()
    for (const c of completions) {
      if (!c.employee_name) continue
      byEmp.set(c.employee_name, (byEmp.get(c.employee_name) || 0) + 1)
    }
    const ranking = [...byEmp.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)

    // Cumplimiento medio semanal (días pasados/hoy con tareas esperadas)
    const relevant = perDay.filter((d) => !d.future && d.expected > 0)
    const avg = relevant.length ? relevant.reduce((s, d) => s + d.ratio, 0) / relevant.length : 0

    // Incidencias de la semana
    const within = (iso) => iso && iso.slice(0, 10) >= week.startStr && iso.slice(0, 10) <= week.endStr
    const allInc = [...(incid.data || []), ...(maint.data || [])]
    const incCreated = allInc.filter((i) => within(i.created_at)).length
    const incResolved = allInc.filter((i) => within(i.resolved_at)).length
    const incOpen = allInc.filter((i) => i.status !== 'done').length

    // Horas del equipo esta semana
    const worked = workedMinutesByEmployee(entries.data || [])
    const totalMin = [...worked.values()].reduce((s, m) => s + m, 0)

    return { perDay, onceDone, recurringDone, pendingToday, ranking, avg, incCreated, incResolved, incOpen, totalMin, worked }
  }, [tpls.data, comps.data, entries.data, incid.data, maint.data, week])

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>

  const maxBar = 84

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center gap-2 px-1 text-ink/55">
        <Activity size={16} />
        <span className="text-sm font-semibold">{week.label}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 p-4">
          <ProgressRing value={data.avg} size={56}><span className="font-display text-sm font-extrabold">{Math.round(data.avg * 100)}%</span></ProgressRing>
          <div><p className="font-display text-lg font-bold leading-tight">Cumplimiento</p><p className="text-xs text-ink/45">agenda media</p></div>
        </Card>
        <Card className="p-4">
          <p className="font-display text-3xl font-extrabold text-ink">{fmtMinutes(data.totalMin)}</p>
          <p className="text-sm text-ink/50">horas del equipo</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-3xl font-extrabold text-sage">{data.onceDone}</p>
          <p className="text-sm text-ink/50">tareas completadas</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 font-display text-3xl font-extrabold text-stone">{data.recurringDone}<Refresh size={18} /></p>
          <p className="text-sm text-ink/50">repasos / rondas</p>
        </Card>
      </div>

      {/* Cumplimiento por día */}
      <SectionCard icon={Activity} title="Cumplimiento por día" persistKey="b13.adminstats.perday">
        <div className="p-4">
          <div className="flex items-end justify-between gap-2" style={{ height: maxBar + 24 }}>
            {data.perDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-7 rounded-lg transition-all ${d.future ? 'bg-ink/8' : d.ratio >= 0.999 ? 'bg-sage' : d.ratio >= 0.5 ? 'bg-bronze' : 'bg-ochre'}`}
                    style={{ height: Math.max(6, d.ratio * maxBar) }}
                    title={`${d.done}/${d.expected}`}
                  />
                </div>
                <span className={`text-xs font-bold ${d.today ? 'text-ink' : 'text-ink/35'}`}>{dowLabel(d.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Pendiente hoy */}
      <SectionCard icon={Alert} title="¿Queda algo por hacer hoy?" right={<CountBadge tone={data.pendingToday.length ? 'ochre' : 'sage'}>{data.pendingToday.length}</CountBadge>} persistKey="b13.adminstats.pending">
        {data.pendingToday.length === 0 ? (
          <div className="flex items-center gap-2 p-4 text-sage"><Check size={18} /><span className="text-sm font-semibold">Todo hecho por hoy 🎉</span></div>
        ) : (
          data.pendingToday.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <span className="h-7 w-1.5 rounded-full bg-ochre" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{t.title}</p>
                  <p className="text-xs text-ink/40">{t.role === 'coach' ? 'Coaches' : 'Limpieza'} · {t.section}</p>
                </div>
                {t.scheduled_time && <span className="flex items-center gap-1 text-xs text-ink/40"><Clock size={12} />{t.scheduled_time.slice(0, 5)}</span>}
              </div>
          ))
        )}
      </SectionCard>

      {/* Incidencias de la semana */}
      <SectionCard icon={Alert} title="Incidencias" persistKey="b13.adminstats.inc">
        <div className="grid grid-cols-3 gap-3 p-3">
          <div className="text-center"><p className="font-display text-2xl font-extrabold text-terracotta">{data.incCreated}</p><p className="text-xs text-ink/45">nuevas</p></div>
          <div className="text-center"><p className="font-display text-2xl font-extrabold text-sage">{data.incResolved}</p><p className="text-xs text-ink/45">resueltas</p></div>
          <div className="text-center"><p className="font-display text-2xl font-extrabold text-ochre">{data.incOpen}</p><p className="text-xs text-ink/45">abiertas</p></div>
        </div>
      </SectionCard>

      {/* Ranking de actividad */}
      {data.ranking.length > 0 && (
        <SectionCard icon={User} title="Actividad por persona" persistKey="b13.adminstats.ranking">
          {data.ranking.map((r, i) => {
              const e = (emp.data || []).find((x) => x.name === r.name)
              return (
                <div key={r.name} className="flex items-center gap-3 p-3">
                  <span className="w-5 text-center font-display text-lg font-extrabold text-ink/30">{i + 1}</span>
                  {e ? <Avatar emp={e} /> : <span className="h-[30px] w-[30px] rounded-full bg-ink/10" />}
                  <p className="flex-1 font-semibold text-ink">{r.name}</p>
                  <span className="font-display text-xl font-extrabold text-ink">{r.n}</span>
                </div>
              )
          })}
        </SectionCard>
      )}
    </div>
  )
}
