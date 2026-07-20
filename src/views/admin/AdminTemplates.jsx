import { useState } from 'react'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { listAllTemplates, createTemplate, updateTemplate, deleteTemplate, reorderTemplates } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useToast } from '../../components/Toast'
import { Card, SectionTitle, Tag } from '../../components/ui'
import Sheet from '../../components/Sheet'
import AdminRecurring from './AdminRecurring'
import { Plus, Trash, Settings, Sunrise, Moon, Activity, Refresh, Clock, ChevronDown, GripVertical } from '../../components/icons'

const WEEKDAYS = [
  { v: 1, l: 'L' }, { v: 2, l: 'M' }, { v: 3, l: 'X' }, { v: 4, l: 'J' },
  { v: 5, l: 'V' }, { v: 6, l: 'S' }, { v: 0, l: 'D' },
]
const SECTIONS = [
  { key: 'apertura', label: 'Apertura', icon: Sunrise },
  { key: 'agenda', label: 'Agenda', icon: Activity },
  { key: 'cierre', label: 'Cierre', icon: Moon },
]
const ROLE_LABEL = { coach: 'Coaches', cleaning: 'Limpieza' }

function emptyDraft(role = 'coach', section = 'agenda') {
  return { role, section, title: '', weekdays: [], scheduled_time: '', recurrence: 'once', recurrence_label: '', category: '', sort_order: 50 }
}

function weekdaysLabel(wd) {
  if (!wd || wd.length === 0) return 'Todos los días'
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.filter((d) => wd.includes(d)).map((d) => WEEKDAYS.find((w) => w.v === d).l).join(' ')
}

function SortableItem({ t, onEdit, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.35 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex w-full items-center gap-1 bg-white">
      <button
        {...listeners}
        {...attributes}
        className="flex-shrink-0 touch-none px-2 py-3 text-ink/20 active:text-ink/50"
        aria-label="Reordenar"
      >
        <GripVertical size={18} />
      </button>
      <button onClick={() => onEdit(t)} className="flex flex-1 items-center gap-3 py-3 pr-4 text-left active:bg-ink/[0.03]">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{t.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink/40">
            <span>{weekdaysLabel(t.weekdays)}</span>
            {t.scheduled_time && <span className="inline-flex items-center gap-0.5"><Clock size={11} />{t.scheduled_time.slice(0, 5)}</span>}
            {t.recurrence === 'recurring' && <span className="inline-flex items-center gap-0.5 text-stone"><Refresh size={11} />{t.recurrence_label}</span>}
          </p>
        </div>
        {t.category && <span className="shrink-0 text-xs font-semibold text-ink/40">{t.category}</span>}
        {!t.active && <Tag status="pending">inactiva</Tag>}
      </button>
    </div>
  )
}

export default function AdminTemplates() {
  const toast = useToast()
  const tpls = useData(listAllTemplates, [])
  const [mode, setMode] = useState('diarias') // 'diarias' | 'preventivas'
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [localOrder, setLocalOrder] = useState({}) // sectionKey → [ids] override
  const [activeItem, setActiveItem] = useState(null)

  function toggleSection(key) { setExpanded((prev) => ({ ...prev, [key]: !prev[key] })) }
  function closeEditor() { setDraft(null); setEditingId(null); setConfirmDel(false) }
  function openNew(role, section) { setEditingId(null); setConfirmDel(false); setDraft(emptyDraft(role, section)) }
  function openEdit(t) {
    setEditingId(t.id)
    setConfirmDel(false)
    setDraft({
      role: t.role, section: t.section, title: t.title,
      weekdays: t.weekdays || [], scheduled_time: t.scheduled_time ? t.scheduled_time.slice(0, 5) : '',
      recurrence: t.recurrence, recurrence_label: t.recurrence_label || '',
      category: t.category || '', sort_order: t.sort_order,
    })
  }

  async function save() {
    if (!draft.title.trim()) { toast('Pon un título', 'error'); return }
    setBusy(true)
    const payload = {
      role: draft.role, section: draft.section, title: draft.title.trim(),
      weekdays: draft.weekdays, scheduled_time: draft.scheduled_time || null,
      recurrence: draft.recurrence, recurrence_label: draft.recurrence === 'recurring' ? (draft.recurrence_label || null) : null,
      category: draft.category.trim() || null, sort_order: draft.sort_order,
    }
    try {
      if (editingId) await updateTemplate(editingId, payload)
      else await createTemplate(payload)
      toast(editingId ? 'Plantilla actualizada' : 'Plantilla creada ✓')
      closeEditor()
      setLocalOrder({})
      await tpls.reload(true)
    } catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  async function remove() {
    if (!editingId) return
    setBusy(true)
    try {
      await deleteTemplate(editingId)
      toast('Plantilla eliminada')
      closeEditor()
      setLocalOrder({})
      await tpls.reload(true)
    } catch { toast('No se pudo eliminar', 'error') } finally { setBusy(false) }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  function getItems(role, sec, baseList) {
    const sectionKey = `${role}-${sec}`
    const base = baseList.filter((t) => t.role === role && t.section === sec)
    if (!localOrder[sectionKey]) return base
    const idOrder = localOrder[sectionKey]
    return [...base].sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id))
  }

  async function handleDragEnd(event, sectionKey) {
    const { active, over } = event
    setActiveItem(null)
    if (!over || active.id === over.id) return

    const baseItems = getItems(...sectionKey.split('-'), tpls.data || [])
    const oldIndex = baseItems.findIndex((t) => t.id === active.id)
    const newIndex = baseItems.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(baseItems, oldIndex, newIndex)
    const newIds = reordered.map((t) => t.id)

    setLocalOrder((prev) => ({ ...prev, [sectionKey]: newIds }))
    try {
      await reorderTemplates(newIds)
    } catch {
      toast('Error al guardar el orden', 'error')
      setLocalOrder((prev) => ({ ...prev, [sectionKey]: undefined }))
    }
  }

  const list = tpls.data || []
  const input = 'field'

  return (
    <div className="space-y-6 pb-24">
      <div className="flex gap-2">
        {[
          { key: 'diarias', label: 'Diarias' },
          { key: 'preventivas', label: 'Preventivas' },
        ].map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-95 ${mode === m.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/55'}`}>
            {m.key === 'preventivas' && <Refresh size={16} />}{m.label}
          </button>
        ))}
      </div>

      {mode === 'preventivas' ? <AdminRecurring /> : (<>
      {['coach', 'cleaning'].map((role) => (
        <div key={role}>
          <SectionTitle icon={Settings}>{ROLE_LABEL[role]}</SectionTitle>
          <div className="space-y-4">
            {SECTIONS.map((sec) => {
              if (role === 'cleaning' && sec.key !== 'agenda') return null
              const Icon = sec.icon
              const sectionKey = `${role}-${sec.key}`
              const isOpen = !!expanded[sectionKey]
              const items = getItems(role, sec.key, list)

              return (
                <Card key={sec.key} className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button onClick={() => toggleSection(sectionKey)} className="flex flex-1 items-center gap-2 text-left active:opacity-70">
                      <Icon size={18} className="text-ink/50" />
                      <p className="flex-1 font-display text-lg font-bold">{sec.label}</p>
                      <span className="text-xs text-ink/30 font-medium">{items.length}</span>
                      <ChevronDown size={18} className={`text-ink/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => openNew(role, sec.key)} className="flex min-h-[44px] items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-bold text-white active:scale-95">
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  {isOpen && (
                    items.length === 0 ? (
                      <p className="border-t border-ink/[0.06] px-4 py-3 text-sm text-ink/35">Sin tareas.</p>
                    ) : (
                      <div className="divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragStart={({ active }) => setActiveItem(items.find((t) => t.id === active.id))}
                          onDragEnd={(e) => handleDragEnd(e, sectionKey)}
                        >
                          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                            {items.map((t) => (
                              <SortableItem key={t.id} t={t} onEdit={openEdit} />
                            ))}
                          </SortableContext>
                          <DragOverlay>
                            {activeItem && (
                              <div className="rounded-2xl shadow-lg ring-1 ring-ink/10">
                                <SortableItem t={activeItem} onEdit={() => {}} overlay />
                              </div>
                            )}
                          </DragOverlay>
                        </DndContext>
                      </div>
                    )
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Editor */}
      <Sheet open={!!draft} onClose={closeEditor} title={editingId ? 'Editar tarea' : 'Nueva tarea'}>
        {draft && (
          <div className="space-y-4">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título de la tarea" className={input} autoFocus />

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Sección</p>
              <div className="flex gap-2">
                {SECTIONS.filter((s) => draft.role === 'coach' || s.key === 'agenda').map((s) => (
                  <button key={s.key} onClick={() => setDraft({ ...draft, section: s.key })}
                    className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${draft.section === s.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Días (ninguno = todos)</p>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((w) => {
                  const on = draft.weekdays.includes(w.v)
                  return (
                    <button key={w.v} onClick={() => setDraft({ ...draft, weekdays: on ? draft.weekdays.filter((x) => x !== w.v) : [...draft.weekdays, w.v] })}
                      className={`h-10 w-10 rounded-full text-sm font-bold transition active:scale-90 ${on ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/50'}`}>
                      {w.l}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Hora</p>
                <input type="time" value={draft.scheduled_time} onChange={(e) => setDraft({ ...draft, scheduled_time: e.target.value })} className={input} />
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Categoría</p>
                <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="aseos, caja…" className={input} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Tipo</p>
              <div className="flex gap-2">
                <button onClick={() => setDraft({ ...draft, recurrence: 'once' })}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${draft.recurrence === 'once' ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
                  Una vez al día
                </button>
                <button onClick={() => setDraft({ ...draft, recurrence: 'recurring' })}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${draft.recurrence === 'recurring' ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
                  Recurrente
                </button>
              </div>
            </div>

            {draft.recurrence === 'recurring' && (
              <input value={draft.recurrence_label} onChange={(e) => setDraft({ ...draft, recurrence_label: e.target.value })} placeholder="Ej: cada 30 min" className={input} />
            )}

            <button onClick={save} disabled={busy} className="btn-primary">
              {editingId ? 'Guardar cambios' : 'Crear tarea'}
            </button>
            {editingId && (
              confirmDel ? (
                <div className="flex items-center gap-2 rounded-2xl bg-terracotta/8 p-2">
                  <span className="flex-1 px-2 text-sm font-semibold text-terracotta">¿Eliminar esta plantilla?</span>
                  <button onClick={() => setConfirmDel(false)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink/60 transition-enter active:scale-95">
                    Cancelar
                  </button>
                  <button onClick={remove} disabled={busy} className="rounded-xl bg-terracotta px-3 py-2 text-sm font-extrabold text-white transition-enter active:scale-95 disabled:opacity-50">
                    Sí, eliminar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-terracotta transition-enter active:scale-95">
                  <Trash size={16} /> Eliminar plantilla
                </button>
              )
            )}
          </div>
        )}
      </Sheet>
      </>)}
    </div>
  )
}
