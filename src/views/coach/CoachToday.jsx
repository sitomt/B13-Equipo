import { useState } from 'react'
import Fichaje from '../../components/Fichaje'
import { TaskRow } from '../../components/cards'
import { Card, ProgressRing, SkeletonList, EmptyState } from '../../components/ui'
import TaskGroup from '../../components/TaskGroup'
import AlertsBanner from '../../components/AlertsBanner'
import AnnouncementsOverlay from './AnnouncementsOverlay'
import { listTemplates, todayCompletions, activeAnnouncements, completeTask } from '../../lib/api'
import { useData } from '../../lib/useData'
import { buildAgenda } from '../../lib/agenda'
import { hourMadrid } from '../../lib/date'
import { haptic } from '../../lib/haptics'
import { useToast } from '../../components/Toast'
import { useSession } from '../../state/session'
import { BirthdayNotice } from '../../components/Birthday'
import NotificationsBanner from '../../components/NotificationsBanner'
import { Sunrise, Moon, Activity, Check } from '../../components/icons'

export default function CoachToday() {
  const { employee } = useSession()
  const toast = useToast()
  const tpl = useData(() => listTemplates('coach'), [])
  const comp = useData(() => todayCompletions('coach'), [], { interval: 45000 })
  const ann = useData(() => activeAnnouncements('coach'), [], { interval: 60000 })
  const [bulkBusy, setBulkBusy] = useState(false)
  const [annsOpen, setAnnsOpen] = useState(false)

  const loading = tpl.loading || comp.loading
  const reload = () => Promise.all([comp.reload(true)])

  const { sections, dayProgress, dayDone, dayTotal } = buildAgenda(tpl.data, comp.data)

  // Marca de una vez todas las tareas que falten de una sección (sin abrir el toggle).
  const aperturaPending = sections.apertura.filter((i) => !i.recurring && !i.done)
  const cierrePending = sections.cierre.filter((i) => !i.recurring && !i.done)
  async function markAllSection(pending, label) {
    if (bulkBusy || pending.length === 0) return
    setBulkBusy(true)
    haptic('success')
    try {
      await Promise.all(pending.map((i) => completeTask(i, employee)))
      toast(`${label} completada · ${pending.length} tareas ✓`)
      await reload()
    } catch {
      toast('No se pudieron completar todas', 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  const markAllBtn = (pending, label) =>
    pending.length > 0 && (
      <button
        onClick={() => markAllSection(pending, label)}
        disabled={bulkBusy}
        className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-sage px-3.5 text-xs font-bold text-white transition-enter active:scale-95 disabled:opacity-50"
      >
        <Check size={14} /> Marcar todo
      </button>
    )

  const agendaDone = sections.agenda.filter((i) => !i.recurring && i.done).length
  const agendaTotal = sections.agenda.filter((i) => !i.recurring).length
  const hasTasks = sections.apertura.length || sections.agenda.length || sections.cierre.length

  return (
    <div className="space-y-5 pb-24">
      <BirthdayNotice />
      <Fichaje employee={employee} />
      <AlertsBanner anns={ann.data || []} onOpen={() => setAnnsOpen(true)} />
      <NotificationsBanner />

      {loading ? (
        <SkeletonList rows={4} />
      ) : !hasTasks ? (
        <EmptyState icon={Activity} title="Sin tareas hoy" subtitle="No hay plantillas configuradas para hoy." />
      ) : (
        /* UNA sola card "Tu día" con tres secciones desplegables dentro:
           Apertura · Tareas de hoy · Cierre. Se entiende qué está dentro de qué. */
        <Card className="overflow-hidden">
          <div className="brand-glow flex items-center gap-4 bg-ink p-5 text-white">
            <ProgressRing value={dayProgress} size={66} track="rgba(255,255,255,0.14)">
              <span className="tabular font-display text-xl font-extrabold text-white">{Math.round(dayProgress * 100)}%</span>
            </ProgressRing>
            <div className="flex-1">
              <p className="font-display text-2xl font-extrabold leading-tight">Tu día</p>
              <p className="tabular text-sm text-white/55">{dayDone} de {dayTotal} tareas hechas</p>
            </div>
          </div>

          <div className="divide-y divide-ink/[0.06]">
            {sections.apertura.length > 0 && (
              <TaskGroup
                icon={Sunrise}
                title="Apertura"
                done={sections.apertura.filter((i) => !i.recurring && i.done).length}
                total={sections.apertura.filter((i) => !i.recurring).length}
                defaultOpen={sections.apertura.some((i) => !i.done)}
                action={markAllBtn(aperturaPending, 'Apertura')}
              >
                {sections.apertura.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </TaskGroup>
            )}

            {sections.agenda.length > 0 && (
              <TaskGroup icon={Activity} title="Tareas de hoy" done={agendaDone} total={agendaTotal} defaultOpen>
                {sections.agenda.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </TaskGroup>
            )}

            {sections.cierre.length > 0 && (
              <TaskGroup
                icon={Moon}
                title="Cierre"
                done={sections.cierre.filter((i) => !i.recurring && i.done).length}
                total={sections.cierre.filter((i) => !i.recurring).length}
                defaultOpen={hourMadrid() >= 17}
                action={markAllBtn(cierrePending, 'Cierre')}
              >
                {sections.cierre.map((i, idx) => (
                  <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                    <TaskRow item={i} employee={employee} onChange={reload} />
                  </div>
                ))}
              </TaskGroup>
            )}
          </div>
        </Card>
      )}

      {annsOpen && <AnnouncementsOverlay anns={ann.data || []} onClose={() => setAnnsOpen(false)} />}
    </div>
  )
}
