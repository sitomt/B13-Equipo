import { useState } from 'react'
import {
  listIncidencias, updateIncidencia, listMaintenance,
  listTemplates, todayCompletions,
} from '../../lib/api'
import { useData } from '../../lib/useData'
import { buildAgenda } from '../../lib/agenda'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import Sheet from '../../components/Sheet'
import { Card, CollapsibleSection, Pill, ProgressRing, Skeleton, EmptyState } from '../../components/ui'
import { Alert, Wrench, Spray, Check, Clock, User } from '../../components/icons'
import { relativeTime, timeHM } from '../../lib/date'

const STATUS = {
  pending: { label: 'Pendiente', pill: 'terracotta' },
  in_progress: { label: 'En curso', pill: 'ochre' },
}

// La pestaña "El gym": visión de estado para evitar duplicados y coordinar equipos.
export default function CoachGym() {
  const { employee } = useSession()
  const toast = useToast()
  const incid = useData(listIncidencias, [], { interval: 30000 })
  const maint = useData(listMaintenance, [], { interval: 30000 })
  const ctpl = useData(() => listTemplates('cleaning'), [])
  const ccomp = useData(() => todayCompletions('cleaning'), [], { interval: 45000 })
  const [busy, setBusy] = useState(null)
  const [resolving, setResolving] = useState(null) // incidencia a resolver (con nota)
  const [note, setNote] = useState('')

  const openIncid = (incid.data || []).filter((i) => i.status !== 'done')
  const openMaint = (maint.data || []).filter((i) => i.status !== 'done')

  const cleaning = buildAgenda(ctpl.data, ccomp.data)
  const cleanItems = cleaning.sections.agenda
  const cleanDone = cleanItems.filter((i) => i.done).length

  function openResolve(i) { setResolving(i); setNote('') }

  async function confirmResolve() {
    const i = resolving
    setBusy(i.id)
    try {
      await updateIncidencia(i.id, {
        status: 'done', resolved_by_name: employee.name, resolved_at: new Date().toISOString(),
        resolution_notes: note.trim() || null,
      })
      await incid.reload(true)
      toast('Incidencia resuelta ✓')
      setResolving(null); setNote('')
    } catch { toast('No se pudo resolver', 'error') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Incidencias internas abiertas (el coach puede resolverlas) */}
      <CollapsibleSection
        icon={Alert}
        title="Incidencias abiertas"
        right={<Pill color={openIncid.length ? 'terracotta' : 'sage'}>{openIncid.length}</Pill>}
        persistKey={`b13.coachgym.incidencias.${employee.id}`}
      >
        {incid.loading ? (
          <Skeleton className="h-20 w-full rounded-xl2" />
        ) : openIncid.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-sage"><Check size={18} /><span className="text-sm font-semibold">Ninguna incidencia abierta</span></Card>
        ) : (
          <div className="space-y-2">
            {openIncid.map((i) => (
              <Card key={i.id} className="overflow-hidden">
                <div className="p-3">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Pill color={STATUS[i.status].pill}>{STATUS[i.status].label}</Pill>
                    {i.category && <span className="text-xs font-semibold text-ink/40">{i.category}</span>}
                    <span className="ml-auto text-xs text-ink/35">{relativeTime(i.created_at)}</span>
                  </div>
                  <p className="font-semibold text-ink">{i.title}</p>
                  <p className="flex items-center gap-1 text-xs text-ink/40">
                    {i.zone && <>{i.zone} · </>}<User size={11} /> {i.reported_by_name}
                  </p>
                </div>
                <button
                  onClick={() => openResolve(i)}
                  disabled={busy === i.id}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-ink/[0.06] py-2.5 text-sm font-bold text-sage active:bg-ink/[0.03] disabled:opacity-50"
                >
                  <Check size={16} /> Marcar resuelta
                </button>
              </Card>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Mantenimiento activo/pendiente (solo lectura: lo lleva el técnico) */}
      <CollapsibleSection
        icon={Wrench}
        title="Mantenimiento activo"
        right={<Pill color={openMaint.length ? 'ochre' : 'sage'}>{openMaint.length}</Pill>}
        persistKey={`b13.coachgym.maintenance.${employee.id}`}
      >
        {openMaint.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-sage"><Check size={18} /><span className="text-sm font-semibold">Nada roto pendiente</span></Card>
        ) : (
          <div className="space-y-2">
            {openMaint.map((i) => (
              <Card key={i.id} className="flex items-center gap-3 p-3">
                <div className={`h-9 w-1.5 rounded-full ${i.priority === 'urgent' ? 'bg-terracotta' : 'bg-ochre'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{i.title}</p>
                  <p className="text-xs text-ink/40">{i.zone} · {relativeTime(i.created_at)}</p>
                </div>
                <Pill color={i.status === 'in_progress' ? 'ochre' : 'terracotta'}>{i.status === 'in_progress' ? 'En curso' : 'Pendiente'}</Pill>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-2 px-1 text-xs text-ink/40">Antes de reportar algo roto, revisa si ya está aquí para no duplicar.</p>
      </CollapsibleSection>

      {/* Cómo va la limpieza de hoy (solo lectura) */}
      <CollapsibleSection
        icon={Spray}
        title="Limpieza de hoy"
        persistKey={`b13.coachgym.cleaning.${employee.id}`}
      >
        {ctpl.loading ? (
          <Skeleton className="h-20 w-full rounded-xl2" />
        ) : cleanItems.length === 0 ? (
          <EmptyState icon={Spray} title="Sin ruta hoy" />
        ) : (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 border-b border-ink/[0.06] p-4">
              <ProgressRing value={cleanItems.length ? cleanDone / cleanItems.length : 0} size={56} color="#5B7A8C">
                <span className="tabular font-display text-base font-extrabold">{cleanDone}/{cleanItems.length}</span>
              </ProgressRing>
              <div>
                <p className="font-display text-lg font-bold text-ink">Ruta de limpieza</p>
                <p className="text-sm text-ink/50">{cleanDone} de {cleanItems.length} hechas hoy</p>
              </div>
            </div>
            <div className="divide-y divide-ink/[0.06]">
              {cleanItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i.done ? 'bg-sage text-white' : 'border-2 border-ink/15'}`}>
                    {i.done && <Check size={14} strokeWidth={3} />}
                  </span>
                  <p className={`flex-1 text-sm font-medium ${i.done ? 'text-ink/40 line-through' : 'text-ink'}`}>{i.title}</p>
                  {i.done ? (
                    <span className="flex items-center gap-1 text-xs text-sage"><User size={11} />{i.lastBy?.split(' ')[0]} · {timeHM(i.lastAt)}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-ink/35"><Clock size={11} />falta</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </CollapsibleSection>

      {/* Resolver incidencia con nota opcional (qué se hizo) */}
      <Sheet open={!!resolving} onClose={() => setResolving(null)} title="Resolver incidencia">
        {resolving && (
          <>
            <p className="mb-1 font-display text-xl font-bold">{resolving.title}</p>
            {resolving.zone && <p className="mb-4 text-sm text-ink/50">{resolving.zone}</p>}
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Nota de resolución (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Qué se ha hecho para resolverlo…"
              className="mb-5 field"
            />
            <button onClick={confirmResolve} disabled={busy === resolving.id} className="btn-primary">
              Marcar como resuelta
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
