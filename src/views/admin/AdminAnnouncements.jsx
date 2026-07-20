import { useState } from 'react'
import { listAllAnnouncements, createAnnouncement, updateAnnouncement, listAnnouncementReads, listEmployees } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { Card, SectionTitle, EmptyState } from '../../components/ui'
import { Megaphone, Check, ChevronDown } from '../../components/icons'
import { todayMadrid } from '../../lib/date'

// ============================================================================
// Avisos (solo VISUALIZACIÓN): activos por urgencia + acuse de lectura.
// Crear avisos vive en "+ → Nuevo aviso". El histórico, tras "Ver histórico".
// ============================================================================
export default function AdminAnnouncements() {
  const { employee } = useSession()
  const toast = useToast()
  const ann = useData(listAllAnnouncements, [])
  const reads = useData(listAnnouncementReads, [], { interval: 30000 })
  const staff = useData(listEmployees, [])
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState(false)

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

  const today = todayMadrid()
  // Activos ordenados por urgencia: destacados primero
  const activeAnn = (ann.data || [])
    .filter((a) => a.active && a.ends_on >= today)
    .sort((a, b) => (b.priority === 'high') - (a.priority === 'high'))
  const pastAnn = (ann.data || []).filter((a) => !a.active || a.ends_on < today)

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

  return (
    <div className="space-y-5 pb-24">
      <div>
        <SectionTitle icon={Megaphone}>Avisos activos</SectionTitle>
        {activeAnn.length === 0 ? (
          <EmptyState icon={Megaphone} title="No hay avisos activos" subtitle='Publica uno desde "+" → Nuevo aviso.' />
        ) : (
          <div className="space-y-2">
            {activeAnn.map((a) => {
              const st = readStat(a)
              const allRead = st.total > 0 && st.read.length === st.total
              const high = a.priority === 'high'
              return (
                <Card key={a.id} className={`p-3.5 ${high ? 'border-l-4 border-l-bronze' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{a.title}</p>
                      {/* Destino y vigencia son información: texto plano */}
                      <p className="mt-0.5 text-xs text-ink/40">
                        {high && <span className="font-bold text-bronze-dark">Destacado · </span>}
                        {a.target_roles.join(', ')} · hasta {a.ends_on}
                      </p>
                    </div>
                    <button onClick={() => deactivate(a)} className="flex min-h-[44px] shrink-0 items-center rounded-full bg-ink/5 px-3.5 text-xs font-semibold text-ink/60 active:scale-95">
                      Archivar
                    </button>
                  </div>
                  {/* Acuse de lectura */}
                  {st.total > 0 && (
                    <div className="mt-2 border-t border-ink/[0.06] pt-2">
                      <div className="flex items-center gap-2">
                        <span className={`tabular flex items-center gap-1 text-xs font-bold ${allRead ? 'text-sage' : 'text-ink/50'}`}>
                          {allRead && <Check size={13} />}
                          {allRead ? 'Leído por todos' : `Leído ${st.read.length}/${st.total}`}
                        </span>
                        {!allRead && st.pending.length > 0 && (
                          <button
                            onClick={() => remind(a, st.pending)}
                            disabled={busy}
                            className="ml-auto flex min-h-[44px] items-center rounded-full bg-bronze/12 px-3.5 text-xs font-bold text-bronze-dark active:scale-95 disabled:opacity-50"
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
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico detrás de un enlace discreto: no satura la pantalla */}
      {pastAnn.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold text-bronze-dark active:opacity-70"
          >
            {showPast ? 'Ocultar histórico' : `Ver histórico (${pastAnn.length})`}
            <ChevronDown size={16} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
          </button>
          {showPast && (
            <div className="mt-2 space-y-2 opacity-60">
              {pastAnn.slice(0, 12).map((a) => (
                <Card key={a.id} className="p-3">
                  <p className="font-semibold text-ink/70">{a.title}</p>
                  <p className="text-xs text-ink/35">{a.target_roles.join(', ')} · finalizó {a.ends_on}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
