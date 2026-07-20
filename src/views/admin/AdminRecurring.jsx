import { useEffect, useState } from 'react'
import { listRecurring, deleteRecurring, updateRecurring, runDueRecurring } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { Card, SectionTitle, Tag, Spinner } from '../../components/ui'
import RecurringTaskSheet from '../../components/RecurringTaskSheet'
import { Wrench, Alert, Plus, Trash, Refresh } from '../../components/icons'
import { recurrenceLabel, nextOccurrence } from '../../lib/date'

const GROUPS = [
  { target: 'mantenimiento', label: 'Técnico', icon: Wrench },
  { target: 'incidencia', label: 'Equipo', icon: Alert },
]

function PlanCard({ p, onEdit, onToggle, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const next = nextOccurrence(p.months, p.day_of_month, p.start_on)
  return (
    <Card className="overflow-hidden">
      <button onClick={() => onEdit(p)} className="w-full p-4 text-left active:bg-ink/[0.03]">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {p.priority === 'urgent' && <Tag status="urgent" />}
          {p.category && <span className="text-xs font-semibold text-ink/40">{p.category}</span>}
          {!p.active && <span className="text-xs font-semibold text-ink/40">pausada</span>}
        </div>
        <p className="font-display text-lg font-bold leading-tight text-ink">{p.title}</p>
        {p.zone && <p className="text-sm font-semibold text-bronze-dark">{p.zone}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink/45">
          <span className="inline-flex items-center gap-1 font-semibold text-stone"><Refresh size={12} />{recurrenceLabel(p.months)} · día {p.day_of_month}</span>
          {p.active && next && <span>· Próxima: {next}</span>}
        </p>
      </button>
      <div className="flex items-center border-t border-ink/[0.06]">
        <button onClick={() => onToggle(p)} className="flex-1 min-h-[44px] text-sm font-bold text-ink/55 active:bg-ink/[0.03]">
          {p.active ? 'Pausar' : 'Reactivar'}
        </button>
        <span className="h-5 w-px bg-ink/[0.06]" />
        {confirmDel ? (
          <div className="flex flex-1 items-center justify-end gap-2 px-2 py-1.5">
            <button onClick={() => setConfirmDel(false)} className="rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs font-bold text-ink/60 active:scale-95">Cancelar</button>
            <button onClick={() => onDelete(p)} className="rounded-lg bg-terracotta px-2.5 py-1.5 text-xs font-extrabold text-white active:scale-95">Eliminar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="flex flex-1 items-center justify-center gap-1.5 min-h-[44px] text-sm font-bold text-terracotta active:bg-ink/[0.03]">
            <Trash size={15} /> Eliminar
          </button>
        )}
      </div>
    </Card>
  )
}

export default function AdminRecurring() {
  const { employee } = useSession()
  const toast = useToast()
  const mant = useData(() => listRecurring('mantenimiento'), [])
  const team = useData(() => listRecurring('incidencia'), [])
  const [sheet, setSheet] = useState(null) // { target, editing }

  const dataFor = (t) => (t === 'mantenimiento' ? mant : team)
  function reloadAll() { mant.reload(true); team.reload(true) }
  // Tras crear/editar, intenta generar ya las que venzan hoy (para que se vean al instante).
  function onSaved() { runDueRecurring().catch(() => {}).finally(reloadAll) }

  // Catch-up al entrar: genera las preventivas vencidas hasta hoy (idempotente).
  useEffect(() => {
    runDueRecurring().catch(() => {})
  }, [])

  async function onToggle(p) {
    try {
      await updateRecurring(p.id, { active: !p.active })
      dataFor(p.target).reload(true)
      toast(p.active ? 'Tarea pausada' : 'Tarea reactivada')
    } catch { toast('No se pudo actualizar', 'error') }
  }
  async function onDelete(p) {
    try {
      await deleteRecurring(p.id)
      dataFor(p.target).reload(true)
      toast('Tarea preventiva eliminada')
    } catch { toast('No se pudo eliminar', 'error') }
  }

  return (
    <div className="space-y-6 pb-24">
      <p className="rounded-2xl bg-bronze/8 px-4 py-3 text-sm text-ink/65">
        Tareas que se generan solas en los meses que elijas (p.ej. revisar filtros del aire cada trimestre).
        Aparecen como pendientes en la cola del técnico o del equipo cuando llega la fecha.
      </p>

      {GROUPS.map((g) => {
        const Icon = g.icon
        const d = dataFor(g.target)
        const list = d.data || []
        return (
          <div key={g.target}>
            <SectionTitle
              icon={Icon}
              right={
                <button onClick={() => setSheet({ target: g.target, editing: null })}
                  className="flex min-h-[44px] items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-bold text-white active:scale-95">
                  <Plus size={14} /> Añadir
                </button>
              }
            >
              {g.label}
            </SectionTitle>
            {d.loading ? (
              <div className="flex justify-center py-6"><Spinner className="h-6 w-6" /></div>
            ) : list.length === 0 ? (
              <p className="px-1 text-sm text-ink/35">Sin tareas preventivas todavía.</p>
            ) : (
              <div className="space-y-3">
                {list.map((p) => (
                  <PlanCard key={p.id} p={p} onEdit={(x) => setSheet({ target: x.target, editing: x })} onToggle={onToggle} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <RecurringTaskSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        employee={employee}
        target={sheet?.target || 'mantenimiento'}
        editing={sheet?.editing || null}
        onSaved={onSaved}
      />
    </div>
  )
}
