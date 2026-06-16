import { useState } from 'react'
import { listAllAnnouncements, createAnnouncement, updateAnnouncement, createAdHoc, listAdHoc, listAnnouncementReads, listEmployees } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { Card, SectionTitle, Pill } from '../../components/ui'
import { Megaphone, Spray, Plus, Check } from '../../components/icons'
import { todayMadrid } from '../../lib/date'

const ROLES = [
  { key: 'coach', label: 'Coaches' },
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'maintenance', label: 'Mantenimiento' },
]
const DURATIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

function endsOnFor(duration) {
  const base = new Date(todayMadrid() + 'T00:00:00')
  if (duration === 'today') return todayMadrid()
  if (duration === 'week') {
    base.setDate(base.getDate() + 6)
    return base.toISOString().slice(0, 10)
  }
  // month: último día del mes actual
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return end.toISOString().slice(0, 10)
}

export default function AdminAnnouncements() {
  const { employee } = useSession()
  const toast = useToast()
  const ann = useData(listAllAnnouncements, [])
  const adhoc = useData(() => listAdHoc('cleaning'), [], { interval: 20000 })
  const reads = useData(listAnnouncementReads, [], { interval: 30000 })
  const staff = useData(listEmployees, [])

  // Para cada aviso: cuántos de su público objetivo lo han leído.
  const readsByAnn = new Map()
  for (const r of reads.data || []) {
    if (!readsByAnn.has(r.announcement_id)) readsByAnn.set(r.announcement_id, new Set())
    readsByAnn.get(r.announcement_id).add(r.employee_id)
  }
  function readStat(a) {
    const audience = (staff.data || []).filter((e) => e.role !== 'admin' && a.target_roles?.includes(e.role))
    const readSet = readsByAnn.get(a.id) || new Set()
    const read = audience.filter((e) => readSet.has(e.id))
    return { read, total: audience.length, pending: audience.filter((e) => !readSet.has(e.id)) }
  }

  // Form aviso
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [roles, setRoles] = useState(['coach'])
  const [duration, setDuration] = useState('today')
  const [high, setHigh] = useState(false)
  const [busy, setBusy] = useState(false)

  // Form urgente limpieza
  const [uTitle, setUTitle] = useState('')
  const [uZone, setUZone] = useState('')

  const today = todayMadrid()
  const activeAnn = (ann.data || []).filter((a) => a.active && a.ends_on >= today)
  const pastAnn = (ann.data || []).filter((a) => !a.active || a.ends_on < today)

  function toggleRole(r) {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))
  }

  async function submitAnnouncement() {
    if (!title.trim()) { toast('Pon un título', 'error'); return }
    if (!roles.length) { toast('Elige a quién', 'error'); return }
    setBusy(true)
    try {
      await createAnnouncement({
        title: title.trim(), body: body.trim() || null,
        target_roles: roles, priority: high ? 'high' : 'normal',
        starts_on: today, ends_on: endsOnFor(duration),
        created_by: employee.id, created_by_name: employee.name,
      })
      toast('Aviso publicado ✓')
      setTitle(''); setBody(''); setHigh(false); setDuration('today'); setRoles(['coach'])
      await ann.reload(true)
    } catch { toast('No se pudo publicar', 'error') } finally { setBusy(false) }
  }

  async function submitUrgent() {
    if (!uTitle.trim()) { toast('Describe la tarea', 'error'); return }
    setBusy(true)
    try {
      await createAdHoc({
        target_role: 'cleaning', title: uTitle.trim(), zone: uZone.trim() || null,
        priority: 'urgent', status: 'pending',
        created_by: employee.id, created_by_name: employee.name,
      })
      toast('Aviso urgente enviado a limpieza ✓')
      setUTitle(''); setUZone('')
      await adhoc.reload(true)
    } catch { toast('No se pudo enviar', 'error') } finally { setBusy(false) }
  }

  async function deactivate(a) {
    try { await updateAnnouncement(a.id, { active: false }); await ann.reload(true); toast('Aviso archivado') }
    catch { toast('Error', 'error') }
  }

  // Reenvía un recordatorio destacado a los roles del aviso que aún no lo han leído.
  async function remind(a, pending) {
    const roles = [...new Set(pending.map((e) => e.role))]
    setBusy(true)
    try {
      await createAnnouncement({
        title: `Recordatorio: ${a.title}`, body: a.body || null,
        target_roles: roles.length ? roles : a.target_roles,
        priority: 'high', starts_on: today, ends_on: a.ends_on,
        created_by: employee.id, created_by_name: employee.name,
      })
      toast('Recordatorio enviado ✓')
      await Promise.all([ann.reload(true), reads.reload(true)])
    } catch { toast('No se pudo recordar', 'error') } finally { setBusy(false) }
  }

  const input = 'field'

  return (
    <div className="space-y-5 pb-24">
      {/* Nuevo aviso */}
      <div>
        <SectionTitle icon={Megaphone}>Nuevo aviso</SectionTitle>
        <Card className="space-y-3 p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del aviso" className={input} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Detalle (opcional)" className={input} />

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">¿Quién lo ve?</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r.key} onClick={() => toggleRole(r.key)}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${roles.includes(r.key) ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">Duración</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button key={d.key} onClick={() => setDuration(d.key)}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${duration === d.key ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/70'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setHigh((v) => !v)} className="flex w-full items-center justify-between rounded-2xl border border-ink/10 px-4 py-3">
            <span className="font-semibold">Destacar (resaltado en bronce)</span>
            <span className={`relative h-6 w-11 rounded-full transition ${high ? 'bg-bronze' : 'bg-ink/15'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${high ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>

          <button onClick={submitAnnouncement} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50">
            <Plus size={20} /> Publicar aviso
          </button>
        </Card>
      </div>

      {/* Aviso urgente a limpieza */}
      <div>
        <SectionTitle icon={Spray}>Aviso urgente a limpieza</SectionTitle>
        <Card className="space-y-3 border border-terracotta/25 p-4">
          <p className="text-sm text-ink/55">Prioritario sobre su ruta normal. Aparece en rojo arriba del todo.</p>
          <input value={uTitle} onChange={(e) => setUTitle(e.target.value)} placeholder="Ej: Limpiar derrame en zona de pesas" className={input} />
          <input value={uZone} onChange={(e) => setUZone(e.target.value)} placeholder="Zona (opcional)" className={input} />
          <button onClick={submitUrgent} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50">
            <Spray size={20} /> Enviar urgente
          </button>
        </Card>
      </div>

      {/* Activos */}
      <div>
        <SectionTitle icon={Check}>Avisos activos</SectionTitle>
        {activeAnn.length === 0 ? (
          <Card className="p-4 text-sm text-ink/45">No hay avisos activos.</Card>
        ) : (
          <div className="space-y-2">
            {activeAnn.map((a) => {
              const st = readStat(a)
              const allRead = st.total > 0 && st.read.length === st.total
              return (
              <Card key={a.id} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {a.priority === 'high' && <Pill color="bronze">Destacado</Pill>}
                      <p className="font-semibold text-ink">{a.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/40">{a.target_roles.join(', ')} · hasta {a.ends_on}</p>
                  </div>
                  <button onClick={() => deactivate(a)} className="shrink-0 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink/60 active:scale-95">
                    Archivar
                  </button>
                </div>
                {/* Acuse de lectura */}
                {st.total > 0 && (
                  <div className="mt-2 border-t border-ink/[0.06] pt-2">
                    <div className="flex items-center gap-2">
                      <Pill color={allRead ? 'sage' : 'ochre'}>{allRead ? 'Leído por todos' : `Leído ${st.read.length}/${st.total}`}</Pill>
                      {!allRead && st.pending.length > 0 && (
                        <button
                          onClick={() => remind(a, st.pending)}
                          className="ml-auto rounded-full bg-bronze/12 px-3 py-1.5 text-xs font-bold text-bronze-dark active:scale-95"
                        >
                          Recordar a {st.pending.length}
                        </button>
                      )}
                    </div>
                    {!allRead && st.pending.length > 0 && (
                      <p className="mt-1.5 text-xs text-ink/45">Falta: {st.pending.map((e) => e.name.split(' ')[0]).join(', ')}</p>
                    )}
                  </div>
                )}
              </Card>
            )})}
          </div>
        )}
      </div>

      {pastAnn.length > 0 && (
        <div>
          <SectionTitle>Histórico</SectionTitle>
          <div className="space-y-2 opacity-60">
            {pastAnn.slice(0, 8).map((a) => (
              <Card key={a.id} className="p-3">
                <p className="font-semibold text-ink/70">{a.title}</p>
                <p className="text-xs text-ink/35">{a.target_roles.join(', ')} · finalizó {a.ends_on}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
