import { useEffect, useState } from 'react'
import {
  listIncidencias, updateIncidencia, deleteIncidencia, reorderIncidencias,
  listMaintenance, updateMaintenance, deleteMaintenance, reorderMaintenance,
} from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { Card, Tag, Spinner, CountBadge } from '../../components/ui'
import SectionCard from '../../components/SectionCard'
import { SegmentedControl, Chip } from '../../components/controls'
import { Alert, Wrench, Check, Clock, User, Trash, GripVertical, ChevronDown, Search, ArrowUp, ArrowDown } from '../../components/icons'
import { shortDate, dateTime, daysBetween, relativeTime } from '../../lib/date'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_FILTERS = [
  { key: 'open', label: 'Abiertas' },
  { key: 'done', label: 'Resueltas' },
  { key: 'all', label: 'Todas' },
]
const SOURCES = [
  { key: 'incidencia', label: 'Internas', icon: Alert },
  { key: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
]

function Step({ color, label, who, when, last }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
        {!last && <span className="my-0.5 w-px flex-1 bg-ink/15" />}
      </div>
      <div className="pb-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink/45">{when}{who ? ` · ${who}` : ''}</p>
      </div>
    </div>
  )
}

function IncidentCard({
  inc, onStart, onResolve, onDelete, isMaint, dragHandle, flat = false,
  reorderMode = false, canMoveUp = false, canMoveDown = false, onMove,
}) {
  const [open, setOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const done = inc.status === 'done'
  const days = daysBetween(inc.created_at, done ? inc.resolved_at : null)
  const aging = !done && days >= 2

  // `flat`: sin Card exterior, para vivir como fila del divide-y de un SectionCard.
  const Wrap = flat ? 'div' : Card
  return (
    <Wrap className={flat ? 'relative' : 'relative overflow-hidden'}>
      {dragHandle && (
        <button
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          aria-label={`Reordenar ${inc.title}`}
          className="absolute right-2 top-2 z-10 flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-xl bg-ink/5 text-ink/45 active:cursor-grabbing active:bg-ink/10"
        >
          <GripVertical size={20} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full p-4 text-left active:bg-ink/[0.025] ${reorderMode ? 'pr-16' : ''}`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Tag status={inc.status} />
          {inc.priority === 'urgent' && !done && <Tag status="urgent" />}
          {/* Área y categoría son información, no estado: texto plano */}
          {inc.area && <span className="text-xs font-semibold text-bronze-dark">{inc.area}</span>}
          {inc.category && <span className="text-xs font-semibold text-ink/40">{inc.category}</span>}
        </div>
        <div className="flex gap-3">
          {inc.photo_url && <img src={inc.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />}
          <div className="min-w-0 flex-1">
            <p className="font-display text-card font-bold leading-tight text-ink">{inc.title}</p>
            {inc.zone && <p className="text-sm font-semibold text-bronze-dark">{inc.zone}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink/45">
              <span className="flex items-center gap-1"><User size={11} /> {inc.reported_by_name || '—'}</span>
              <span>· {shortDate(inc.created_at)}</span>
              {done ? (
                <span className="font-semibold text-sage">· resuelta en {days === 0 ? 'el día' : `${days} día${days > 1 ? 's' : ''}`}</span>
              ) : (
                <span className={`font-semibold ${aging ? 'text-terracotta' : 'text-ink/45'}`}>· abierta {days === 0 ? 'hoy' : `hace ${days} día${days > 1 ? 's' : ''}`}</span>
              )}
            </p>
            <span className="mt-2 flex min-h-[28px] items-center gap-1 text-xs font-bold text-bronze-dark">
              {open ? 'Ocultar detalle' : 'Ver detalle'}
              <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </div>
      </button>

      {reorderMode && (
        <div className="flex gap-2 border-t border-ink/[0.06] px-4 py-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            aria-label={`Subir ${inc.title}`}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink/5 text-sm font-bold text-ink/60 disabled:opacity-30"
          >
            <ArrowUp size={16} /> Subir
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            aria-label={`Bajar ${inc.title}`}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink/5 text-sm font-bold text-ink/60 disabled:opacity-30"
          >
            <ArrowDown size={16} /> Bajar
          </button>
        </div>
      )}

      {open && (
        <div className="border-t border-ink/[0.06] bg-sand-50 px-4 py-3">
          {inc.description && <p className="mb-3 text-sm text-ink/65">{inc.description}</p>}
          {inc.photo_url && (
            <a href={inc.photo_url} target="_blank" rel="noreferrer" className="mb-3 block">
              <img src={inc.photo_url} alt="incidencia" className="h-44 w-full rounded-xl object-cover" />
            </a>
          )}
          <div className="rounded-xl bg-white p-3">
            <Step color="bg-terracotta" label="Reportada" who={inc.reported_by_name} when={dateTime(inc.created_at)} />
            {inc.started_at && <Step color="bg-ochre" label="En curso" who={inc.started_by_name} when={dateTime(inc.started_at)} last={!done} />}
            {done && <Step color="bg-sage" label="Resuelta" who={inc.resolved_by_name} when={dateTime(inc.resolved_at)} last />}
            {!done && !inc.started_at && <Step color="bg-ink/20" label="Sin empezar" when={`pendiente · ${relativeTime(inc.created_at)}`} last />}
          </div>
          {inc.resolution_notes && (
            <div className={`mt-2 rounded-xl p-2.5 text-sm ${done ? 'bg-sage/8 text-sage' : 'bg-ochre/10 text-[#8a6a1e]'}`}>
              <span className="font-semibold">{done ? 'Resolución:' : 'Nota del técnico:'}</span> {inc.resolution_notes}
            </div>
          )}
          {!done && (
            <div className="mt-3 flex gap-2">
              {inc.status === 'pending' && isMaint && (
                <button onClick={() => onStart(inc)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ochre/15 min-h-[44px] text-sm font-bold text-[#8a6a1e] transition-enter active:scale-95">
                  <Clock size={16} /> Marcar en curso
                </button>
              )}
              <button onClick={() => onResolve(inc)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sage min-h-[44px] text-sm font-bold text-white transition-enter active:scale-95">
                <Check size={16} /> Marcar resuelta
              </button>
            </div>
          )}

          {confirmDel ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-terracotta/8 p-2">
              <span className="flex-1 px-1 text-sm font-semibold text-terracotta">¿Eliminar definitivamente?</span>
              <button onClick={() => setConfirmDel(false)} className="min-h-[44px] rounded-lg bg-white px-3 text-sm font-bold text-ink/60 transition-enter active:scale-95">Cancelar</button>
              <button onClick={() => onDelete(inc)} className="min-h-[44px] rounded-lg bg-terracotta px-3 text-sm font-extrabold text-white transition-enter active:scale-95">Sí, eliminar</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl min-h-[44px] text-sm font-bold text-terracotta transition-enter active:scale-95">
              <Trash size={16} /> Eliminar {isMaint ? 'parte' : 'incidencia'}
            </button>
          )}
        </div>
      )}
    </Wrap>
  )
}

function SortableIncident({ inc, ...rest }) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id: inc.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'relative z-20 rounded-2xl bg-white opacity-90 shadow-float' : 'relative'}>
      <IncidentCard inc={inc} dragHandle={rest.reorderMode ? { attributes, listeners } : null} {...rest} />
    </div>
  )
}

export default function AdminIncidents() {
  const { employee } = useSession()
  const toast = useToast()
  const incidencias = useData(listIncidencias, [], { interval: 20000 })
  const maintenance = useData(listMaintenance, [], { interval: 20000 })
  const [source, setSource] = useState('incidencia')
  const [sf, setSf] = useState('open')
  const [query, setQuery] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [items, setItems] = useState([])

  const isMaint = source === 'mantenimiento'
  const active = isMaint ? maintenance : incidencias
  const list = active.data || []
  const done = list.filter((i) => i.status === 'done')

  // Sincroniza la lista ordenable con los datos y el filtro.
  useEffect(() => {
    const l = active.data || []
    const q = query.trim().toLowerCase()
    const byStatus = sf === 'open' ? l.filter((i) => i.status !== 'done') : sf === 'done' ? l.filter((i) => i.status === 'done') : l
    const filtered = q
      ? byStatus.filter((i) => `${i.title} ${i.description || ''} ${i.area || ''} ${i.zone || ''} ${i.category || ''}`.toLowerCase().includes(q))
      : byStatus
    setItems(filtered)
  }, [active.data, sf, source, query]) // eslint-disable-line

  useEffect(() => {
    if (sf !== 'open' || query.trim()) setReorderMode(false)
  }, [sf, query])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function persistOrder(next) {
    const fn = isMaint ? reorderMaintenance : reorderIncidencias
    fn(next.map((x) => x.id)).then(() => active.reload(true)).catch(() => toast('No se pudo reordenar', 'error'))
  }

  function onDragEnd(e) {
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    setItems((cur) => {
      const oldI = cur.findIndex((x) => x.id === a.id)
      const newI = cur.findIndex((x) => x.id === over.id)
      if (oldI < 0 || newI < 0) return cur
      const next = arrayMove(cur, oldI, newI)
      haptic('tap')
      persistOrder(next)
      return next
    })
  }

  function moveBy(id, direction) {
    setItems((cur) => {
      const from = cur.findIndex((x) => x.id === id)
      const to = from + direction
      if (from < 0 || to < 0 || to >= cur.length) return cur
      const next = arrayMove(cur, from, to)
      haptic('tap')
      persistOrder(next)
      return next
    })
  }

  async function onStart(i) {
    try {
      await updateMaintenance(i.id, { status: 'in_progress', started_at: i.started_at || new Date().toISOString(), started_by_name: i.started_by_name || employee.name })
      await maintenance.reload(true); toast('Marcado en curso')
    } catch { toast('No se pudo actualizar', 'error') }
  }
  async function onResolve(i) {
    try {
      const patch = { status: 'done', resolved_by_name: employee.name, resolved_at: new Date().toISOString() }
      if (isMaint) { await updateMaintenance(i.id, patch); await maintenance.reload(true) }
      else { await updateIncidencia(i.id, patch); await incidencias.reload(true) }
      toast('Marcada como resuelta ✓')
    } catch { toast('No se pudo actualizar', 'error') }
  }
  async function onDelete(i) {
    try {
      if (isMaint) { await deleteMaintenance(i.id); await maintenance.reload(true) }
      else { await deleteIncidencia(i.id); await incidencias.reload(true) }
      toast(isMaint ? 'Parte eliminado' : 'Incidencia eliminada')
    } catch { toast('No se pudo eliminar', 'error') }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Cambio de vista entre las dos colas (no es una acción → control segmentado) */}
      <SegmentedControl
        options={SOURCES}
        value={source}
        onChange={(next) => { setSource(next); setReorderMode(false) }}
      />

      {/* Resumen informativo: recuento por estado de la cola activa */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: list.filter((i) => i.status === 'pending').length, label: 'Pendientes', color: 'text-terracotta', bg: 'bg-terracotta/[0.07]' },
          { n: list.filter((i) => i.status === 'in_progress').length, label: 'En curso', color: 'text-ochre', bg: 'bg-ochre/[0.08]' },
          { n: done.length, label: 'Resueltas', color: 'text-sage', bg: 'bg-sage/[0.08]' },
        ].map((s) => (
          <Card key={s.label} className={`p-3.5 text-center ${s.bg}`}>
            <p className={`tabular font-display text-[34px] font-extrabold leading-none ${s.color}`}>{s.n}</p>
            <p className="mt-1.5 text-xs font-semibold text-ink/45">{s.label}</p>
          </Card>
        ))}
      </div>

      <div>
        <label htmlFor="incident-search" className="mb-1.5 block px-1 text-xs font-bold text-ink/50">
          Buscar en {isMaint ? 'mantenimiento' : 'incidencias internas'}
        </label>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            id="incident-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título, área, zona o etiqueta"
            className="field !pl-11"
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-xs font-bold text-ink/50">Estado</p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.key} selected={sf === f.key} onClick={() => setSf(f.key)} className="w-full px-2">
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {sf === 'open' && !query.trim() && items.length > 1 && (
        <button
          type="button"
          onClick={() => setReorderMode((v) => !v)}
          aria-pressed={reorderMode}
          className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition ${
            reorderMode ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/65'
          }`}
        >
          {reorderMode ? <Check size={17} /> : <GripVertical size={18} />}
          {reorderMode ? 'Terminar ordenación' : 'Ordenar prioridad'}
        </button>
      )}

      {/* La gestión de áreas y etiquetas vive en Club → Gestión. */}
      <SectionCard
        icon={isMaint ? Wrench : Alert}
        title={isMaint ? 'Partes de mantenimiento' : 'Incidencias internas'}
        right={items.length > 0 ? <CountBadge tone="ink">{items.length}</CountBadge> : null}
        empty={{ icon: isMaint ? Wrench : Alert, text: 'No hay registros en este filtro.' }}
      >
        {active.loading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
        ) : items.length > 0 ? (
          <>
            {reorderMode && (
              <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-ink/50">
                <GripVertical size={16} /> Arrastra o usa Subir/Bajar. El primer elemento tiene mayor prioridad.
              </p>
            )}
            {/* DndContext/SortableContext no crean nodos DOM: las filas quedan
                como hijas directas del divide-y del SectionCard. */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((i, index) => (
                  <SortableIncident
                    key={i.id}
                    inc={i}
                    onStart={onStart}
                    onResolve={onResolve}
                    onDelete={onDelete}
                    isMaint={isMaint}
                    flat
                    reorderMode={reorderMode}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                    onMove={(direction) => moveBy(i.id, direction)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        ) : null}
      </SectionCard>
    </div>
  )
}
