import { useEffect, useState } from 'react'
import { Card, Tag, CountBadge, Skeleton, EmptyState } from '../../components/ui'
import SectionCard from '../../components/SectionCard'
import Sheet from '../../components/Sheet'
import { Chip, Button } from '../../components/controls'
import { listMaintenance, updateMaintenance, listAreas } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import AlertsBanner from '../../components/AlertsBanner'
import { BirthdayNotice } from '../../components/Birthday'
import { Wrench, Alert, Check, Clock, User, Pencil, Search } from '../../components/icons'
import { relativeTime } from '../../lib/date'

// `flat` la renderiza sin card exterior, para usarla como fila de un SectionCard.
function IncidentCard({ inc, onStart, onResolve, onNote, flat = false }) {
  const urgent = inc.priority === 'urgent'
  const done = inc.status === 'done'
  const Wrap = flat ? 'div' : Card
  return (
    <Wrap className={`overflow-hidden ${done ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Tag status={inc.status} />
          {urgent && !done && <Tag status="urgent" />}
          {/* Área y categoría son información, no estado: texto plano */}
          {inc.area && <span className="text-xs font-semibold text-bronze-dark">{inc.area}</span>}
          {inc.category && <span className="text-xs font-semibold text-ink/40">{inc.category}</span>}
          <span className="ml-auto text-xs text-ink/35">{relativeTime(inc.created_at)}</span>
        </div>
        <p className="font-display text-card font-bold leading-tight text-ink">{inc.title}</p>
        {inc.zone && <p className="text-sm font-semibold text-bronze-dark">{inc.zone}</p>}
        {inc.description && <p className="mt-1 text-sm text-ink/60">{inc.description}</p>}
        {inc.photo_url && (
          <a href={inc.photo_url} target="_blank" rel="noreferrer" className="mt-2 block">
            <img src={inc.photo_url} alt="incidencia" className="h-40 w-full rounded-xl object-cover" loading="lazy" />
          </a>
        )}
        <p className="mt-2 flex items-center gap-1 text-xs text-ink/40">
          <User size={12} /> Reportado por {inc.reported_by_name || 'desconocido'}
        </p>
        {inc.resolution_notes && (
          <div className={`mt-2 rounded-xl p-2.5 text-sm ${done ? 'bg-sage/8 text-sage' : 'bg-ochre/10 text-[#8a6a1e]'}`}>
            <span className="font-semibold">{done ? 'Resolución:' : 'Nota:'}</span> {inc.resolution_notes}
          </div>
        )}
      </div>
      {!done && (
        <div className="flex border-t border-ink/[0.06]">
          {inc.status === 'pending' && (
            <button onClick={() => onStart(inc)} className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 text-sm font-bold text-ochre active:bg-ink/[0.03]">
              <Clock size={16} /> Empezar
            </button>
          )}
          <button onClick={() => onNote(inc)} className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 text-sm font-bold text-ink/60 active:bg-ink/[0.03]">
            <Pencil size={15} /> {inc.resolution_notes ? 'Editar nota' : 'Nota'}
          </button>
          <button onClick={() => onResolve(inc)} className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 text-sm font-bold text-sage active:bg-ink/[0.03]">
            <Check size={16} /> Resolver
          </button>
        </div>
      )}
    </Wrap>
  )
}

// Día del técnico: "Tus reparaciones". `refresh` fuerza recarga (tras crear
// una tarea desde el "+" del navbar). Los avisos vigentes llegan de la View
// (useAnnouncements); el banner salta a la pestaña "Avisos" del navbar.
export default function MaintenanceToday({ refresh = 0, anns = [], onOpenAnns }) {
  const { employee } = useSession()
  const toast = useToast()
  const inc = useData(listMaintenance, [], { interval: 20000 })
  const areas = useData(listAreas, [])
  const [areaFilter, setAreaFilter] = useState(null) // null = todas las áreas
  const [query, setQuery] = useState('')             // búsqueda por texto
  const [donePeriod, setDonePeriod] = useState(30)   // días hacia atrás en Resueltas
  const [resolving, setResolving] = useState(null)
  const [note, setNote] = useState('')
  const [noting, setNoting] = useState(null)   // tarea a la que se le añade/edita nota
  const [noteDraft, setNoteDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (refresh) inc.reload(true) }, [refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  function openResolve(i) { setResolving(i); setNote(i.resolution_notes || '') }
  function openNote(i) { setNoting(i); setNoteDraft(i.resolution_notes || '') }

  async function saveNote() {
    setBusy(true)
    try {
      await updateMaintenance(noting.id, { resolution_notes: noteDraft.trim() || null })
      await inc.reload(true)
      toast('Nota guardada ✓')
      setNoting(null); setNoteDraft('')
    } catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  const q = query.trim().toLowerCase()
  const matchesQ = (i) => !q || `${i.title} ${i.zone || ''} ${i.area || ''} ${i.description || ''}`.toLowerCase().includes(q)
  const list = (inc.data || []).filter((i) => (!areaFilter || i.area === areaFilter) && matchesQ(i))
  const pending = list.filter((i) => i.status === 'pending')
  const inProgress = list.filter((i) => i.status === 'in_progress')
  const doneSince = Date.now() - donePeriod * 86400000
  const done = list.filter((i) => i.status === 'done' &&
    (donePeriod === 0 || new Date(i.resolved_at || i.created_at).getTime() >= doneSince))

  async function start(i) {
    try {
      await updateMaintenance(i.id, {
        status: 'in_progress',
        assigned_to: employee.id,
        started_at: i.started_at || new Date().toISOString(),
        started_by_name: i.started_by_name || employee.name,
      })
      await inc.reload(true)
      toast('Incidencia en curso')
    } catch { toast('No se pudo actualizar', 'error') }
  }

  async function confirmResolve() {
    setBusy(true)
    try {
      await updateMaintenance(resolving.id, {
        status: 'done',
        assigned_to: employee.id,
        resolved_by_name: employee.name,
        resolution_notes: note.trim() || null,
        resolved_at: new Date().toISOString(),
      })
      await inc.reload(true)
      toast('Parte resuelto ✓')
      setResolving(null); setNote('')
    } catch { toast('No se pudo actualizar', 'error') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <BirthdayNotice />
      {/* Banner de avisos arriba del contenido (paridad con coach y limpieza) */}
      <AlertsBanner anns={anns} onOpen={onOpenAnns} />
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: pending.length, label: 'Pendientes', color: 'text-terracotta', bg: 'bg-terracotta/[0.07]' },
          { n: inProgress.length, label: 'En curso', color: 'text-ochre', bg: 'bg-ochre/[0.08]' },
          { n: done.length, label: 'Resueltas', color: 'text-sage', bg: 'bg-sage/[0.08]' },
        ].map((s) => (
          <Card key={s.label} className={`p-3.5 text-center ${s.bg}`}>
            <p className={`tabular font-display text-[34px] font-extrabold leading-none ${s.color}`}>{s.n}</p>
            <p className="mt-1.5 text-xs font-semibold text-ink/45">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Búsqueda en el histórico (título, zona, área, descripción) */}
      <div>
        <label htmlFor="maintenance-search" className="mb-1.5 block px-1 text-xs font-bold text-ink/50">
          Buscar en reparaciones
        </label>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            id="maintenance-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título, zona, área o descripción"
            className="field !pl-10"
          />
        </div>
      </div>

      {areas.data && areas.data.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip selected={areaFilter === null} onClick={() => setAreaFilter(null)} className="shrink-0">
            Todas
          </Chip>
          {areas.data.map((a) => (
            <Chip key={a.id} selected={areaFilter === a.name} onClick={() => setAreaFilter(a.name)} className="shrink-0">
              {a.name}
            </Chip>
          ))}
        </div>
      )}

      {inc.loading ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-28 w-full rounded-xl2" />
          <Skeleton className="h-28 w-full rounded-xl2" />
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <SectionCard icon={Alert} title="Pendientes" right={<CountBadge tone="terracotta">{pending.length}</CountBadge>} persistKey="b13.mant.pending">
              {pending.map((i, idx) => (
                <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                  <IncidentCard inc={i} onStart={start} onResolve={openResolve} onNote={openNote} flat />
                </div>
              ))}
            </SectionCard>
          )}
          {inProgress.length > 0 && (
            <SectionCard icon={Clock} title="En curso" right={<CountBadge tone="ochre">{inProgress.length}</CountBadge>} persistKey="b13.mant.progress">
              {inProgress.map((i, idx) => (
                <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                  <IncidentCard inc={i} onStart={start} onResolve={openResolve} onNote={openNote} flat />
                </div>
              ))}
            </SectionCard>
          )}
          {done.length > 0 && (
            <SectionCard icon={Check} title="Resueltas" right={<CountBadge tone="sage">{done.length}</CountBadge>} persistKey="b13.mant.done" defaultOpen={false}>
              <div className="flex gap-2 p-3">
                {[{ d: 7, l: '7 días' }, { d: 30, l: '30 días' }, { d: 0, l: 'Todas' }].map((o) => (
                  <Chip key={o.d} selected={donePeriod === o.d} onClick={() => setDonePeriod(o.d)} className="flex-1">
                    {o.l}
                  </Chip>
                ))}
              </div>
              {done.map((i) => <IncidentCard key={i.id} inc={i} onStart={start} onResolve={openResolve} onNote={openNote} flat />)}
            </SectionCard>
          )}
          {!list.length && <EmptyState icon={Wrench} title="Todo en orden" subtitle="No hay incidencias reportadas." />}
        </>
      )}

      <Sheet open={!!resolving} onClose={() => setResolving(null)} title="Resolver parte">
        {resolving && (
          <>
            <p className="mb-1 font-display text-card font-bold">{resolving.title}</p>
            <p className="mb-4 text-sm text-ink/50">{resolving.zone}</p>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Nota de resolución (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Qué se ha hecho para arreglarlo…"
              className="mb-5 field"
            />
            <Button variant="sage" full loading={busy} onClick={confirmResolve}>
              Marcar como resuelta
            </Button>
          </>
        )}
      </Sheet>

      {/* Nota del técnico: por qué una tarea sigue pendiente o sin terminar */}
      <Sheet open={!!noting} onClose={() => setNoting(null)} title="Nota de la tarea">
        {noting && (
          <>
            <p className="mb-1 font-display text-card font-bold">{noting.title}</p>
            <p className="mb-4 text-sm text-ink/50">{noting.zone}</p>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">¿Por qué no se ha terminado?</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ej: Falta una pieza, pedida al proveedor; vuelvo el lunes…"
              className="mb-5 field"
            />
            <Button variant="ink" full loading={busy} onClick={saveNote}>
              Guardar nota
            </Button>
          </>
        )}
      </Sheet>
    </div>
  )
}
