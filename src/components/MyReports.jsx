import { myIncidencias, myMaintenance, myFeedback } from '../lib/api'
import { useData } from '../lib/useData'
import { Card, CollapsibleSection, Tag, CountBadge } from './ui'
import { User, Check } from './icons'
import { relativeTime } from '../lib/date'

// Etiqueta del tipo de reporte (información, no estado: texto plano).
const TYPE_LABEL = {
  incidencia: 'Incidencia',
  mantenimiento: 'Mantenimiento',
  feedback: 'Feedback',
}

// "Mis reportes": lo que este empleado ha reportado (incidencias, partes,
// feedback) y en qué estado está, para que sepa que se atendió aunque ya no
// aparezca en las listas abiertas. Sección secundaria: si no hay nada, no se
// renderiza. `sources` permite reutilizarla entre roles.
export default function MyReports({ employee, sources = [] }) {
  const wantInc = sources.includes('incidencia')
  const wantMaint = sources.includes('mantenimiento')
  const wantFb = sources.includes('feedback')

  // Los hooks se llaman siempre (regla de hooks); las fuentes no pedidas
  // resuelven a lista vacía sin tocar la red.
  const inc = useData(() => (wantInc ? myIncidencias(employee.id) : Promise.resolve([])), [employee.id], { interval: 60000 })
  const maint = useData(() => (wantMaint ? myMaintenance(employee.id) : Promise.resolve([])), [employee.id], { interval: 60000 })
  const fb = useData(() => (wantFb ? myFeedback(employee.id) : Promise.resolve([])), [employee.id], { interval: 60000 })

  // Lista unificada ordenada por fecha de creación desc.
  const items = [
    ...(inc.data || []).map((r) => ({ ...r, _type: 'incidencia' })),
    ...(maint.data || []).map((r) => ({ ...r, _type: 'mantenimiento' })),
    ...(fb.data || []).map((r) => ({ ...r, _type: 'feedback' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (items.length === 0) return null

  return (
    <CollapsibleSection
      icon={User}
      title="Mis reportes"
      right={<CountBadge tone="ink">{items.length}</CountBadge>}
      persistKey={`b13.myreports.${employee.id}`}
    >
      <div className="space-y-2">
        {items.map((r) => {
          const isFb = r._type === 'feedback'
          const resolved = !isFb && r.status === 'done'
          return (
            <Card key={`${r._type}-${r.id}`} className="p-3">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-ink/40">{TYPE_LABEL[r._type]}</span>
                {isFb ? (
                  r.status === 'done' ? <Tag status="done">Gestionado</Tag> : <Tag status="pending" />
                ) : (
                  <Tag status={r.status} />
                )}
                <span className="ml-auto text-xs text-ink/35">{relativeTime(r.created_at)}</span>
              </div>
              <p className="truncate font-semibold text-ink">{isFb ? r.message : r.title}</p>
              {resolved && (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-sage">
                  <Check size={12} /> Resuelta {relativeTime(r.resolved_at)}{r.resolved_by_name ? ` · ${r.resolved_by_name}` : ''}
                </p>
              )}
              {resolved && r.resolution_notes && (
                <p className="mt-1 text-xs text-ink/50">{r.resolution_notes}</p>
              )}
            </Card>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}
