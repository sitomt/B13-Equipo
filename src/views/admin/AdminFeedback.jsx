import { useState } from 'react'
import { listFeedback, updateFeedback, deleteFeedback } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useToast } from '../../components/Toast'
import { Card, Tag, CountBadge, Spinner } from '../../components/ui'
import SectionCard from '../../components/SectionCard'
import { Chat, User, Check, Trash } from '../../components/icons'
import { relativeTime, dateTime } from '../../lib/date'

const TYPE_META = {
  cliente: { label: 'Cliente', pill: 'stone' },
  sugerencia: { label: 'Sugerencia', pill: 'bronze' },
  app: { label: 'App', pill: 'ochre' },
}
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'sugerencia', label: 'Sugerencia' },
  { key: 'app', label: 'App' },
]

function FeedbackCard({ f, onToggle, onDelete, flat = false }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const done = f.status === 'done'
  const meta = TYPE_META[f.type] || { label: f.type, pill: 'ink' }
  // `flat`: sin Card exterior, para vivir como fila del divide-y de un SectionCard.
  const Wrap = flat ? 'div' : Card
  return (
    <Wrap className={`${flat ? '' : 'overflow-hidden'} ${done ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink/45">{meta.label}</span>
          {done && <Tag status="done">Gestionado</Tag>}
          <span className="ml-auto text-xs text-ink/35">{relativeTime(f.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{f.message}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-ink/40">
          <User size={12} /> {f.created_by_name || 'desconocido'} · {dateTime(f.created_at)}
        </p>
      </div>
      <div className="flex border-t border-ink/[0.06]">
        <button
          onClick={() => onToggle(f)}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold active:bg-ink/[0.03] ${done ? 'text-ink/50' : 'text-sage'}`}
        >
          <Check size={16} /> {done ? 'Marcar pendiente' : 'Marcar gestionado'}
        </button>
        {confirmDel ? (
          <>
            <button onClick={() => setConfirmDel(false)} className="flex-1 py-3 text-sm font-bold text-ink/60 active:bg-ink/[0.03]">Cancelar</button>
            <button onClick={() => onDelete(f)} className="flex-1 py-3 text-sm font-extrabold text-terracotta active:bg-ink/[0.03]">Sí, eliminar</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-ink/[0.06] py-3 text-sm font-bold text-terracotta active:bg-ink/[0.03]">
            <Trash size={16} /> Eliminar
          </button>
        )}
      </div>
    </Wrap>
  )
}

export default function AdminFeedback() {
  const toast = useToast()
  const fb = useData(listFeedback, [], { interval: 30000 })
  const [filter, setFilter] = useState('all')

  const all = fb.data || []
  const list = filter === 'all' ? all : all.filter((f) => f.type === filter)
  const pending = all.filter((f) => f.status !== 'done')

  async function onToggle(f) {
    try {
      await updateFeedback(f.id, { status: f.status === 'done' ? 'new' : 'done' })
      await fb.reload(true)
    } catch { toast('No se pudo actualizar', 'error') }
  }
  async function onDelete(f) {
    try {
      await deleteFeedback(f.id)
      await fb.reload(true)
      toast('Feedback eliminado')
    } catch { toast('No se pudo eliminar', 'error') }
  }

  return (
    <div className="space-y-4 pb-24">
      <SectionCard
        icon={Chat}
        title="Feedback del equipo"
        right={<CountBadge tone={pending.length ? 'ochre' : 'sage'}>{pending.length} sin ver</CountBadge>}
        persistKey="b13.admin.feedback"
      >
        {/* Filtros como primera fila del divide-y */}
        <div className="flex gap-2 p-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-2xl min-h-[44px] text-sm font-bold transition active:scale-95 ${filter === f.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/60'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {fb.loading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
        ) : list.length === 0 ? (
          <div className="flex items-center gap-2 p-4 text-xs text-ink/40">
            <Chat size={16} />
            <span>Aquí aparecerá el feedback que envíen los coaches.</span>
          </div>
        ) : (
          list.map((f, idx) => (
            <div key={f.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
              <FeedbackCard f={f} onToggle={onToggle} onDelete={onDelete} flat />
            </div>
          ))
        )}
      </SectionCard>
    </div>
  )
}
