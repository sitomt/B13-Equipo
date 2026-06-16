import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import { Card, CollapsibleSection, Pill, Skeleton, EmptyState } from '../components/ui'
import Sheet from '../components/Sheet'
import SpeedDial from '../components/SpeedDial'
import ReportIncident from '../components/ReportIncident'
import AnnouncementSheet from '../components/AnnouncementSheet'
import GeoGate from '../components/GeoGate'
import { listMaintenance, updateMaintenance, activeAnnouncements, listAreas } from '../lib/api'
import { useData } from '../lib/useData'
import { useSession } from '../state/session'
import { useToast } from '../components/Toast'
import { AnnouncementCard } from '../components/cards'
import { BirthdayNotice } from '../components/Birthday'
import { Wrench, Alert, Check, Clock, User, Megaphone, Plus, Pencil, Search } from '../components/icons'
import { relativeTime, timeHM } from '../lib/date'

const STATUS = {
  pending: { label: 'Pendiente', pill: 'terracotta' },
  in_progress: { label: 'En curso', pill: 'ochre' },
  done: { label: 'Resuelta', pill: 'sage' },
}

function IncidentCard({ inc, onStart, onResolve, onNote }) {
  const urgent = inc.priority === 'urgent'
  const done = inc.status === 'done'
  return (
    <Card className={`overflow-hidden ${done ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Pill color={STATUS[inc.status].pill}>{STATUS[inc.status].label}</Pill>
          {urgent && !done && <Pill color="terracotta">URGENTE</Pill>}
          {inc.area && <Pill color="bronze">{inc.area}</Pill>}
          {inc.category && <span className="text-xs font-semibold text-ink/40">{inc.category}</span>}
          <span className="ml-auto text-xs text-ink/35">{relativeTime(inc.created_at)}</span>
        </div>
        <p className="font-display text-lg font-bold leading-tight text-ink">{inc.title}</p>
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
            <button onClick={() => onStart(inc)} className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold text-ochre active:bg-ink/[0.03]">
              <Clock size={16} /> Empezar
            </button>
          )}
          <button onClick={() => onNote(inc)} className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold text-ink/60 active:bg-ink/[0.03]">
            <Pencil size={15} /> {inc.resolution_notes ? 'Editar nota' : 'Nota'}
          </button>
          <button onClick={() => onResolve(inc)} className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold text-sage active:bg-ink/[0.03]">
            <Check size={16} /> Resolver
          </button>
        </div>
      )}
    </Card>
  )
}

export default function MaintenanceView() {
  const { employee } = useSession()
  const toast = useToast()
  const inc = useData(listMaintenance, [], { interval: 20000 })
  const ann = useData(() => activeAnnouncements('maintenance'), [], { interval: 60000 })
  const areas = useData(listAreas, [])
  const [areaFilter, setAreaFilter] = useState(null) // null = todas las áreas
  const [query, setQuery] = useState('')             // búsqueda por texto
  const [donePeriod, setDonePeriod] = useState(30)   // días hacia atrás en Resueltas
  const [resolving, setResolving] = useState(null)
  const [note, setNote] = useState('')
  const [noting, setNoting] = useState(null)   // tarea a la que se le añade/edita nota
  const [noteDraft, setNoteDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false) // aviso a coaches (no a limpieza)

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
    <Screen>
      <Header subtitle="Mantenimiento" />
      <div className="mx-auto max-w-md space-y-5 px-4 pt-4">
       <GeoGate employee={employee}>
        <BirthdayNotice />
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
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar parte…"
            className="field !pl-10"
          />
        </div>

        {areas.data && areas.data.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <button
              onClick={() => setAreaFilter(null)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
                areaFilter === null ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/60'
              }`}
            >
              Todas
            </button>
            {areas.data.map((a) => (
              <button
                key={a.id}
                onClick={() => setAreaFilter(a.name)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
                  areaFilter === a.name ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/60'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {ann.data && ann.data.length > 0 && ann.data.map((a) => <AnnouncementCard key={a.id} a={a} />)}

        {inc.loading ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-28 w-full rounded-xl2" />
            <Skeleton className="h-28 w-full rounded-xl2" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <CollapsibleSection icon={Alert} title="Pendientes" right={<Pill color="terracotta">{pending.length}</Pill>} persistKey="b13.mant.pending">
                <div className="space-y-3">
                  {pending.map((i, idx) => (
                    <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                      <IncidentCard inc={i} onStart={start} onResolve={openResolve} onNote={openNote} />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
            {inProgress.length > 0 && (
              <CollapsibleSection icon={Clock} title="En curso" right={<Pill color="ochre">{inProgress.length}</Pill>} persistKey="b13.mant.progress">
                <div className="space-y-3">
                  {inProgress.map((i, idx) => (
                    <div key={i.id} className="animate-rise-in" style={{ animationDelay: `${idx * 35}ms` }}>
                      <IncidentCard inc={i} onStart={start} onResolve={openResolve} onNote={openNote} />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
            {done.length > 0 && (
              <CollapsibleSection icon={Check} title="Resueltas" right={<Pill color="sage">{done.length}</Pill>} persistKey="b13.mant.done" defaultOpen={false}>
                <div className="mb-3 flex gap-2">
                  {[{ d: 7, l: '7 días' }, { d: 30, l: '30 días' }, { d: 0, l: 'Todas' }].map((o) => (
                    <button
                      key={o.d}
                      onClick={() => setDonePeriod(o.d)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 ${
                        donePeriod === o.d ? 'bg-ink text-white' : 'bg-ink/5 text-ink/55'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {done.map((i) => <IncidentCard key={i.id} inc={i} onStart={start} onResolve={openResolve} onNote={openNote} />)}
                </div>
              </CollapsibleSection>
            )}
            {!list.length && <EmptyState icon={Wrench} title="Todo en orden" subtitle="No hay incidencias reportadas." />}
          </>
        )}
       </GeoGate>
      </div>

      <SpeedDial
        bottom="bottom-5"
        actions={[
          { icon: Wrench, label: 'Añadir tarea', tone: 'bronze', onClick: () => setReportOpen(true) },
          { icon: Megaphone, label: 'Mandar aviso', tone: 'ink', onClick: () => setAnnOpen(true) },
        ]}
      />
      <ReportIncident
        open={reportOpen} onClose={() => setReportOpen(false)} employee={employee}
        onCreated={() => inc.reload(true)}
        heading="Añadir tarea de mantenimiento"
        desc="Registra una avería o tarea de las instalaciones para gestionarla."
      />
      <AnnouncementSheet
        open={annOpen} onClose={() => setAnnOpen(false)} employee={employee}
        authorRole="maintenance" allowHighlight={false} fixedRoles={['coach', 'admin']} title="Mandar aviso"
      />

      <Sheet open={!!resolving} onClose={() => setResolving(null)} title="Resolver parte">
        {resolving && (
          <>
            <p className="mb-1 font-display text-xl font-bold">{resolving.title}</p>
            <p className="mb-4 text-sm text-ink/50">{resolving.zone}</p>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Nota de resolución (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Qué se ha hecho para arreglarlo…"
              className="mb-5 field"
            />
            <button onClick={confirmResolve} disabled={busy} className="w-full rounded-2xl bg-sage py-4 text-lg font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50">
              Marcar como resuelta
            </button>
          </>
        )}
      </Sheet>

      {/* Nota del técnico: por qué una tarea sigue pendiente o sin terminar */}
      <Sheet open={!!noting} onClose={() => setNoting(null)} title="Nota de la tarea">
        {noting && (
          <>
            <p className="mb-1 font-display text-xl font-bold">{noting.title}</p>
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
            <button onClick={saveNote} disabled={busy} className="btn-primary">
              Guardar nota
            </button>
          </>
        )}
      </Sheet>
    </Screen>
  )
}
