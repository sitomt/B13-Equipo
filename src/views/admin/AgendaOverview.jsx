import { useState } from 'react'
import { listAllTemplates, listRecurring } from '../../lib/api'
import { useData } from '../../lib/useData'
import { Card, SectionTitle, Tag, CountBadge, SkeletonList, EmptyState } from '../../components/ui'
import { SegmentedControl } from '../../components/controls'
import { recurrenceLabel, nextOccurrence } from '../../lib/date'
import { Settings, Sunrise, Moon, Activity, Refresh, Clock, Wrench, Alert, Pencil } from '../../components/icons'

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

function weekdaysLabel(wd) {
  if (!wd || wd.length === 0) return 'Todos los días'
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.filter((d) => wd.includes(d)).map((d) => WEEKDAYS.find((w) => w.v === d).l).join(' ')
}

// ============================================================================
// Pestaña "Agenda" (solo VISUALIZACIÓN): qué tareas tiene programadas cada
// equipo. La edición vive en su pantalla dedicada ("+ → Editar agenda").
// ============================================================================
export default function AgendaOverview() {
  const [mode, setMode] = useState('diarias')
  const tpls = useData(listAllTemplates, [])
  const mant = useData(() => listRecurring('mantenimiento'), [])
  const team = useData(() => listRecurring('incidencia'), [])

  const list = tpls.data || []

  return (
    <div className="space-y-6 pb-24">
      <SegmentedControl
        options={[{ key: 'diarias', label: 'Diarias' }, { key: 'preventivas', label: 'Preventivas', icon: Refresh }]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'diarias' ? (
        tpls.loading ? (
          <SkeletonList rows={5} />
        ) : list.length === 0 ? (
          <EmptyState icon={Settings} title="Sin tareas en la agenda" subtitle='Créalas desde "+" → Editar agenda.' />
        ) : (
          ['coach', 'cleaning'].map((role) => (
            <div key={role}>
              <SectionTitle icon={Settings}>{ROLE_LABEL[role]}</SectionTitle>
              <div className="space-y-4">
                {SECTIONS.map((sec) => {
                  if (role === 'cleaning' && sec.key !== 'agenda') return null
                  const items = list.filter((t) => t.role === role && t.section === sec.key)
                  if (!items.length) return null
                  const Icon = sec.icon
                  return (
                    <Card key={sec.key} className="overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <Icon size={18} className="text-ink/50" />
                        <p className="flex-1 font-display text-card font-bold">{sec.label}</p>
                        <CountBadge tone="ink">{items.length}</CountBadge>
                      </div>
                      <div className="divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
                        {items.map((t) => (
                          <div key={t.id} className="px-4 py-3">
                            <p className="truncate font-semibold text-ink">{t.title}</p>
                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink/40">
                              <span>{weekdaysLabel(t.weekdays)}</span>
                              {t.scheduled_time && <span className="inline-flex items-center gap-0.5"><Clock size={11} />{t.scheduled_time.slice(0, 5)}</span>}
                              {t.recurrence === 'recurring' && <span className="inline-flex items-center gap-0.5 text-stone"><Refresh size={11} />{t.recurrence_label}</span>}
                              {t.category && <span className="font-semibold text-ink/45">{t.category}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )
      ) : (
        [{ target: 'mantenimiento', label: 'Técnico', icon: Wrench, d: mant }, { target: 'incidencia', label: 'Equipo', icon: Alert, d: team }].map((g) => {
          const plans = g.d.data || []
          return (
            <div key={g.target}>
              <SectionTitle icon={g.icon}>{g.label}</SectionTitle>
              {g.d.loading ? (
                <SkeletonList rows={2} />
              ) : plans.length === 0 ? (
                <p className="px-1 text-sm text-ink/35">Sin tareas preventivas.</p>
              ) : (
                <div className="space-y-3">
                  {plans.map((p) => {
                    const next = nextOccurrence(p.months, p.day_of_month, p.start_on)
                    return (
                      <Card key={p.id} className="p-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {p.priority === 'urgent' && <Tag status="urgent" />}
                          {!p.active && <span className="text-xs font-semibold text-ink/40">pausada</span>}
                          {p.category && <span className="text-xs font-semibold text-ink/40">{p.category}</span>}
                        </div>
                        <p className="font-display text-card font-bold leading-tight text-ink">{p.title}</p>
                        {p.zone && <p className="text-sm font-semibold text-bronze-dark">{p.zone}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink/45">
                          <span className="inline-flex items-center gap-1 font-semibold text-stone"><Refresh size={12} />{recurrenceLabel(p.months)} · día {p.day_of_month}</span>
                          {p.active && next && <span>· Próxima: {next}</span>}
                        </p>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}

      <p className="flex items-center gap-1.5 px-1 text-xs text-ink/40">
        <Pencil size={12} /> Para crear o cambiar tareas: «+» → Editar agenda.
      </p>
    </div>
  )
}
