import { useState } from 'react'
import { TaskRow, AdHocCard } from '../../components/cards'
import Fichaje from '../../components/Fichaje'
import { Card, CollapsibleSection, CountBadge, ProgressRing, SkeletonList, EmptyState } from '../../components/ui'
import TaskGroup from '../../components/TaskGroup'
import AlertsBanner from '../../components/AlertsBanner'
import AnnouncementsOverlay from '../coach/AnnouncementsOverlay'
import { listTemplates, todayCompletions, listAdHoc, activeAnnouncements } from '../../lib/api'
import { useData } from '../../lib/useData'
import { buildAgenda } from '../../lib/agenda'
import { useSession } from '../../state/session'
import { BirthdayNotice } from '../../components/Birthday'
import NotificationsBanner from '../../components/NotificationsBanner'
import { Map, Spray, Activity, Alert } from '../../components/icons'

export default function CleaningToday() {
  const { employee } = useSession()
  const tpl = useData(() => listTemplates('cleaning'), [])
  const comp = useData(() => todayCompletions('cleaning'), [], { interval: 45000 })
  const adhoc = useData(() => listAdHoc('cleaning'), [], { interval: 20000 })
  const ann = useData(() => activeAnnouncements('cleaning'), [], { interval: 60000 })
  const [annsOpen, setAnnsOpen] = useState(false)

  const reload = () => Promise.all([comp.reload(true), adhoc.reload(true)])
  const agenda = buildAgenda(tpl.data, comp.data)

  const daily = agenda.sections.agenda.filter((i) => i.category === 'diaria')
  const weekly = agenda.sections.agenda.filter((i) => i.category === 'semanal')
  const dailyDone = daily.filter((i) => i.done).length
  const weeklyDone = weekly.filter((i) => i.done).length

  const urgentPending = (adhoc.data || []).filter((t) => t.status === 'pending' && t.priority === 'urgent')
  const otherAdhoc = (adhoc.data || []).filter((t) => !(t.status === 'pending' && t.priority === 'urgent'))

  return (
    <div className="space-y-5 pb-24">
      <BirthdayNotice />
      {urgentPending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-terracotta">
            <Alert size={18} />
            <h2 className="font-display text-card font-bold">Aviso urgente del admin</h2>
          </div>
          {urgentPending.map((t) => <AdHocCard key={t.id} task={t} employee={employee} onChange={reload} />)}
        </div>
      )}

      <Fichaje employee={employee} />
      <AlertsBanner anns={ann.data || []} onOpen={() => setAnnsOpen(true)} />
      <NotificationsBanner />

      {tpl.loading ? (
        <SkeletonList rows={4} />
      ) : !daily.length && !weekly.length ? (
        <EmptyState icon={Map} title="Sin ruta hoy" subtitle="No hay tareas de limpieza configuradas." />
      ) : (
        /* UNA sola card "Tu ruta de hoy" con las secciones desplegables dentro */
        <Card className="overflow-hidden">
          <div className="brand-glow flex items-center gap-4 bg-ink p-5 text-white">
            <ProgressRing value={daily.length ? dailyDone / daily.length : 0} size={66} color="#8FB3C7" track="rgba(255,255,255,0.14)">
              <span className="tabular font-display text-xl font-extrabold text-white">{dailyDone}/{daily.length}</span>
            </ProgressRing>
            <div className="flex-1">
              <p className="font-display text-2xl font-extrabold leading-tight">Tu ruta de hoy</p>
              <p className="text-sm text-white/55">Tareas diarias obligatorias</p>
            </div>
          </div>

          <div className="divide-y divide-ink/[0.06]">
            {daily.length > 0 && (
              <TaskGroup icon={Map} title="Ruta diaria" done={dailyDone} total={daily.length} defaultOpen>
                {daily.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </TaskGroup>
            )}

            {weekly.length > 0 && (
              <TaskGroup icon={Spray} title="Hoy además toca" done={weeklyDone} total={weekly.length} defaultOpen>
                {weekly.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </TaskGroup>
            )}
          </div>
        </Card>
      )}

      {otherAdhoc.length > 0 && (
        <CollapsibleSection icon={Activity} title="Tareas puntuales" right={<CountBadge tone="ink">{otherAdhoc.length}</CountBadge>} persistKey="b13.clean.puntuales">
          <div className="space-y-2">
            {otherAdhoc.map((t) => <AdHocCard key={t.id} task={t} employee={employee} onChange={reload} />)}
          </div>
        </CollapsibleSection>
      )}

      {annsOpen && <AnnouncementsOverlay anns={ann.data || []} onClose={() => setAnnsOpen(false)} />}
    </div>
  )
}
