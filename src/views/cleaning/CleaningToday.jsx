import { TaskRow, AnnouncementCard, AdHocCard } from '../../components/cards'
import Fichaje from '../../components/Fichaje'
import { Card, CollapsibleSection, Pill, ProgressRing, SkeletonList, EmptyState } from '../../components/ui'
import { listTemplates, todayCompletions, listAdHoc, activeAnnouncements } from '../../lib/api'
import { useData } from '../../lib/useData'
import { buildAgenda } from '../../lib/agenda'
import { useSession } from '../../state/session'
import { BirthdayNotice } from '../../components/Birthday'
import NotificationsBanner from '../../components/NotificationsBanner'
import { Map, Spray, Megaphone, Activity, Alert } from '../../components/icons'

export default function CleaningToday() {
  const { employee } = useSession()
  const tpl = useData(() => listTemplates('cleaning'), [])
  const comp = useData(() => todayCompletions('cleaning'), [], { interval: 45000 })
  const adhoc = useData(() => listAdHoc('cleaning'), [], { interval: 20000 })
  const ann = useData(() => activeAnnouncements('cleaning'), [], { interval: 60000 })

  const reload = () => Promise.all([comp.reload(true), adhoc.reload(true)])
  const agenda = buildAgenda(tpl.data, comp.data)

  const daily = agenda.sections.agenda.filter((i) => i.category === 'diaria')
  const weekly = agenda.sections.agenda.filter((i) => i.category === 'semanal')
  const dailyDone = daily.filter((i) => i.done).length

  const urgentPending = (adhoc.data || []).filter((t) => t.status === 'pending' && t.priority === 'urgent')
  const otherAdhoc = (adhoc.data || []).filter((t) => !(t.status === 'pending' && t.priority === 'urgent'))

  return (
    <div className="space-y-5 pb-24">
      <BirthdayNotice />
      {urgentPending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-terracotta">
            <Alert size={18} />
            <h2 className="font-display text-xl font-bold">Aviso urgente del admin</h2>
          </div>
          {urgentPending.map((t) => <AdHocCard key={t.id} task={t} employee={employee} onChange={reload} />)}
        </div>
      )}

      <Fichaje employee={employee} />
      <NotificationsBanner />

      {ann.data && ann.data.length > 0 && (
        <CollapsibleSection icon={Megaphone} title="Avisos" right={<Pill color="bronze">{ann.data.length}</Pill>} persistKey="b13.clean.avisos">
          <div className="space-y-2">
            {ann.data.map((a) => <AnnouncementCard key={a.id} a={a} />)}
          </div>
        </CollapsibleSection>
      )}

      {tpl.loading ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <Card className="brand-glow flex items-center gap-4 !border-white/10 !bg-ink p-5 text-white">
            <ProgressRing value={daily.length ? dailyDone / daily.length : 0} size={66} color="#8FB3C7" track="rgba(255,255,255,0.14)">
              <span className="tabular font-display text-xl font-extrabold text-white">{dailyDone}/{daily.length}</span>
            </ProgressRing>
            <div className="flex-1">
              <p className="font-display text-2xl font-extrabold leading-tight">Ruta de hoy</p>
              <p className="text-sm text-white/55">Tareas diarias obligatorias</p>
            </div>
          </Card>

          {daily.length > 0 && (
            <CollapsibleSection icon={Map} title="Ruta diaria" right={<Pill color="stone">{dailyDone}/{daily.length}</Pill>} persistKey="b13.clean.diaria">
              <Card className="divide-y divide-ink/[0.06]">
                {daily.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </Card>
            </CollapsibleSection>
          )}

          {weekly.length > 0 && (
            <CollapsibleSection icon={Spray} title="Hoy además toca" right={<Pill color="stone">{weekly.length}</Pill>} persistKey="b13.clean.semanal">
              <Card className="divide-y divide-ink/[0.06]">
                {weekly.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </Card>
            </CollapsibleSection>
          )}

          {otherAdhoc.length > 0 && (
            <CollapsibleSection icon={Activity} title="Tareas puntuales" right={<Pill color="stone">{otherAdhoc.length}</Pill>} persistKey="b13.clean.puntuales">
              <div className="space-y-2">
                {otherAdhoc.map((t) => <AdHocCard key={t.id} task={t} employee={employee} onChange={reload} />)}
              </div>
            </CollapsibleSection>
          )}

          {!daily.length && !weekly.length && (
            <EmptyState icon={Map} title="Sin ruta hoy" subtitle="No hay tareas de limpieza configuradas." />
          )}
        </>
      )}
    </div>
  )
}
