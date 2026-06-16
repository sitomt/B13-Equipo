import {
  listEmployees, allTodayEntries, listIncidencias, listMaintenance, listAllAnnouncements,
  listAdHoc, listTemplates, todayCompletions, deriveStatus,
} from '../../lib/api'
import { useData } from '../../lib/useData'
import { buildAgenda } from '../../lib/agenda'
import { useState, useEffect } from 'react'
import { todayMadrid, timeHM, relativeTime, appliesToday } from '../../lib/date'
import { Card, CollapsibleSection, Pill, ProgressRing, Spinner, Avatar } from '../../components/ui'
import { AnnouncementCard } from '../../components/cards'
import { BirthdayNotice } from '../../components/Birthday'
import Fichaje from '../../components/Fichaje'
import NotificationsBanner from '../../components/NotificationsBanner'
import { useSession } from '../../state/session'
import { User, Activity, Alert, Megaphone, Spray, Coffee, Utensils, Check, Refresh, ChevronDown, Clock } from '../../components/icons'

const STATUS_META = {
  working: { label: 'En turno', color: 'bg-sage', text: 'text-sage', icon: Activity },
  break: { label: 'Pausa', color: 'bg-ochre', text: 'text-ochre', icon: Coffee },
  meal: { label: 'Comida', color: 'bg-stone', text: 'text-stone', icon: Utensils },
  out: { label: 'Fuera', color: 'bg-ink/20', text: 'text-ink/40', icon: User },
}

// Fila desplegable de una tarea recurrente: nº de veces hoy + quién y cuándo.
function RecurringRow({ row }) {
  const [open, setOpen] = useState(false)
  const last = row.comps[row.comps.length - 1]
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left active:bg-ink/[0.03]">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${row.comps.length ? 'bg-sage/12 text-sage' : 'bg-ink/5 text-ink/40'}`}>
          <Refresh size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{row.t.title}</p>
          <p className="text-xs text-ink/40">
            {row.t.role === 'coach' ? 'Coaches' : 'Limpieza'} · {row.t.recurrence_label}
            {last && <> · última {timeHM(last.completed_at)}</>}
          </p>
        </div>
        <span className={`font-display text-2xl font-extrabold ${row.comps.length ? 'text-sage' : 'text-ink/25'}`}>{row.comps.length}</span>
        <ChevronDown size={18} className={`text-ink/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-ink/[0.06] bg-sand-50 px-3 py-2">
          {row.comps.length === 0 ? (
            <p className="py-2 text-sm text-ink/40">Sin pasadas registradas hoy.</p>
          ) : (
            row.comps.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 text-sm">
                <Clock size={13} className="text-ink/30" />
                <span className="font-semibold text-ink/70">{timeHM(c.completed_at)}</span>
                <span className="text-ink/30">·</span>
                <span className="text-ink/60">{c.employee_name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { employee } = useSession()
  const emp = useData(listEmployees, [])
  const entries = useData(allTodayEntries, [], { interval: 15000 })
  const incid = useData(listIncidencias, [], { interval: 20000 })
  const maint = useData(listMaintenance, [], { interval: 20000 })
  const ann = useData(listAllAnnouncements, [], { interval: 60000 })
  const adhoc = useData(() => listAdHoc('cleaning'), [], { interval: 20000 })

  const coachTpl = useData(() => listTemplates('coach'), [])
  const coachComp = useData(() => todayCompletions('coach'), [], { interval: 30000 })
  const cleanTpl = useData(() => listTemplates('cleaning'), [])
  const cleanComp = useData(() => todayCompletions('cleaning'), [], { interval: 30000 })

  // Sello real de última sincronización: marca la hora cuando llegan datos nuevos
  // de presencia (no la hora de pintado, que era engañosa).
  const [syncedAt, setSyncedAt] = useState(Date.now())
  useEffect(() => { if (entries.data) setSyncedAt(Date.now()) }, [entries.data])

  if (emp.loading || entries.loading) {
    return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
  }

  // Presencia: estado por empleado (no admin)
  const byEmp = new Map()
  for (const e of entries.data || []) {
    if (!byEmp.has(e.employee_id)) byEmp.set(e.employee_id, [])
    byEmp.get(e.employee_id).push(e)
  }
  const staff = (emp.data || []).filter((e) => e.role !== 'admin')
  const RANK = { working: 0, break: 1, meal: 1, out: 2 }
  const presence = staff
    .map((e) => ({ emp: e, status: deriveStatus(byEmp.get(e.id) || []), entries: byEmp.get(e.id) || [] }))
    .sort((a, b) => RANK[a.status] - RANK[b.status])
  const present = presence.filter((p) => p.status !== 'out')

  // Progreso
  const coachProg = buildAgenda(coachTpl.data, coachComp.data)
  const cleanProg = buildAgenda(cleanTpl.data, cleanComp.data)
  const cleanDaily = cleanProg.sections.agenda.filter((i) => i.category === 'diaria')
  const cleanDailyDone = cleanDaily.filter((i) => i.done).length

  // Rondas/repasos recurrentes de hoy (ej. aseos): nº y quién
  const allComp = [...(coachComp.data || []), ...(cleanComp.data || [])]
  const compByTpl = new Map()
  for (const c of allComp) {
    if (!c.template_id) continue
    if (!compByTpl.has(c.template_id)) compByTpl.set(c.template_id, [])
    compByTpl.get(c.template_id).push(c)
  }
  const recurringRows = [...(coachTpl.data || []), ...(cleanTpl.data || [])]
    .filter((t) => t.recurrence === 'recurring' && appliesToday(t.weekdays))
    .map((t) => ({
      t,
      comps: (compByTpl.get(t.id) || []).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at)),
    }))

  const openIncid = (incid.data || []).filter((i) => i.status !== 'done')
  const openMaint = (maint.data || []).filter((i) => i.status !== 'done')
  const openAll = [
    ...openIncid.map((i) => ({ ...i, _src: 'inc' })),
    ...openMaint.map((i) => ({ ...i, _src: 'mant' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const today = todayMadrid()
  const activeAnn = (ann.data || []).filter((a) => a.active && a.starts_on <= today && a.ends_on >= today)
  const urgentClean = (adhoc.data || []).filter((t) => t.status === 'pending' && t.priority === 'urgent')

  return (
    <div className="space-y-5 pb-24">
      <BirthdayNotice />
      {/* El responsable también ficha (sin geocerca: desde cualquier sitio) */}
      <Fichaje employee={employee} />
      <NotificationsBanner />
      {/* En directo */}
      <div className="card-line inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-3 pr-3.5 shadow-card">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage" />
        </span>
        <span className="text-sm font-semibold text-ink/60">En directo · actualizado {timeHM(new Date(syncedAt).toISOString())}</span>
      </div>

      {/* Aviso urgente activo a limpieza */}
      {urgentClean.length > 0 && (
        <Card className="border border-terracotta/30 bg-terracotta/[0.06] p-4">
          <div className="flex items-center gap-2 text-terracotta">
            <Spray size={18} />
            <p className="font-bold">{urgentClean.length} aviso(s) urgente(s) a limpieza sin atender</p>
          </div>
          {urgentClean.map((t) => (
            <p key={t.id} className="mt-1 text-sm text-ink/60">· {t.title} {t.zone && `(${t.zone})`}</p>
          ))}
        </Card>
      )}

      {/* Avisos activos: TODO lo que está activo en el gym ahora (dirección + equipo).
          Los de dirección salen destacados; los del equipo, discretos con su autor. */}
      {activeAnn.length > 0 && (
        <CollapsibleSection icon={Megaphone} title="Avisos activos" right={<Pill color="bronze">{activeAnn.length}</Pill>} persistKey="b13.admin.avisos">
          <div className="space-y-2">
            {activeAnn.map((a) => <AnnouncementCard key={a.id} a={a} />)}
          </div>
        </CollapsibleSection>
      )}

      {/* Quién está — solo quien está fichado (en turno o en pausa/comida).
          Se actualiza solo: 'entries' refresca cada 15s al fichar cualquiera. */}
      <CollapsibleSection icon={User} title="Equipo ahora" right={<Pill color={present.length ? 'sage' : 'ink'}>{present.length}</Pill>} persistKey="b13.admin.equipo">
        {present.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-ink/45">
            <User size={18} /> <span className="text-sm font-semibold">Nadie fichado ahora mismo</span>
          </Card>
        ) : (
          <Card className="divide-y divide-ink/[0.06]">
            {present.map(({ emp: e, status, entries: ents }) => {
              const m = STATUS_META[status]
              const clockIn = ents.find((x) => x.kind === 'clock_in')
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 animate-rise-in">
                  <Avatar emp={e} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{e.name}</p>
                    <p className="text-xs capitalize text-ink/40">{e.role}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${m.text}`}>
                      <span className={`h-2 w-2 rounded-full ${m.color}`} /> {m.label}
                    </span>
                    {clockIn && (
                      <p className="text-xs text-ink/35">desde {timeHM(clockIn.occurred_at)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </CollapsibleSection>

      {/* Progreso operativo */}
      <CollapsibleSection icon={Activity} title="Progreso de hoy" persistKey="b13.admin.progreso">
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col items-center gap-2 p-4">
            <ProgressRing value={coachProg.dayProgress} size={72}>
              <span className="font-display text-lg font-extrabold">{Math.round(coachProg.dayProgress * 100)}%</span>
            </ProgressRing>
            <p className="text-sm font-semibold text-ink/60">Agenda coaches</p>
            <p className="text-xs text-ink/40">{coachProg.dayDone}/{coachProg.dayTotal} tareas</p>
          </Card>
          <Card className="flex flex-col items-center gap-2 p-4">
            <ProgressRing value={cleanDaily.length ? cleanDailyDone / cleanDaily.length : 0} size={72} color="#5B7A8C">
              <span className="font-display text-lg font-extrabold">{cleanDailyDone}/{cleanDaily.length}</span>
            </ProgressRing>
            <p className="text-sm font-semibold text-ink/60">Ruta limpieza</p>
            <p className="text-xs text-ink/40">tareas diarias</p>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Rondas y repasos recurrentes de hoy (aseos, etc.) */}
      {recurringRows.length > 0 && (
        <CollapsibleSection icon={Refresh} title="Rondas y repasos de hoy" persistKey="b13.admin.rondas">
          <Card className="divide-y divide-ink/[0.06]">
            {recurringRows.map((row) => <RecurringRow key={row.t.id} row={row} />)}
          </Card>
        </CollapsibleSection>
      )}

      {/* Incidencias y mantenimiento abiertos */}
      <CollapsibleSection icon={Alert} title="Incidencias y mantenimiento" right={<Pill color="ink">{openAll.length}</Pill>} persistKey="b13.admin.incidencias">
        {openAll.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-sage"><Check size={18} /> <span className="text-sm font-semibold">Nada pendiente</span></Card>
        ) : (
          <div className="space-y-2">
            {openAll.map((i) => (
              <Card key={i._src + i.id} className="flex items-center gap-3 p-3">
                <div className={`h-9 w-1.5 rounded-full ${i.priority === 'urgent' ? 'bg-terracotta' : 'bg-ochre'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{i.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink/40">
                    <Pill color={i._src === 'mant' ? 'bronze' : 'stone'}>{i._src === 'mant' ? 'Mant.' : 'Interna'}</Pill>
                    {i.zone} · {relativeTime(i.created_at)}
                  </p>
                </div>
                <Pill color={i.status === 'in_progress' ? 'ochre' : 'terracotta'}>
                  {i.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                </Pill>
              </Card>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}
