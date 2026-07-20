import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Card, SectionTitle, CollapsibleSection, CountBadge, Spinner, ConfirmSheet, EmptyState, Avatar } from '../../components/ui'
import { listAllEmployees, createEmployee, updateEmployee, deactivateEmployee, clearPin, reconcileOpenShifts } from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { isBirthdayToday } from '../../lib/date'
import GeofenceEditor from '../../components/GeofenceEditor'
import TimeEntriesEditor from '../../components/TimeEntriesEditor'
import { User, Plus, Trash, Power, Settings, Dumbbell, Spray, Wrench, Key, MapPin, Clock } from '../../components/icons'

const ROLE_META = {
  admin: { label: 'Administración', short: 'Admin', icon: Settings },
  coach: { label: 'Coaches', short: 'Coach', icon: Dumbbell },
  cleaning: { label: 'Limpieza', short: 'Limpieza', icon: Spray },
  maintenance: { label: 'Mantenimiento', short: 'Mant.', icon: Wrench },
}
const ROLE_ORDER = ['admin', 'coach', 'cleaning', 'maintenance']

// Paleta de marca para el avatar (mismo color que usa RoleSwitcher / fichajes).
const COLORS = ['#B98A5E', '#A4774C', '#5E8C61', '#B4503C', '#C99A3E', '#5B7A8C', '#2C2925']

// Hoja de alta/edición de un perfil.
function EmployeeEditor({ open, onClose, editing, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [role, setRole] = useState('coach')
  const [color, setColor] = useState(COLORS[0])
  const [birthDate, setBirthDate] = useState('')
  const [geofenced, setGeofenced] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmPin, setConfirmPin] = useState(false)

  // Sincroniza el formulario al abrir (alta vacía o edición prerrellenada).
  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) {
    setName(editing?.name || '')
    setRole(editing?.role || 'coach')
    setColor(editing?.color || COLORS[0])
    setBirthDate(editing?.birth_date || '')
    setGeofenced(editing?.geofenced ?? true)
    setConfirmPin(false)
    setLastOpen(true)
  } else if (!open && lastOpen) {
    setLastOpen(false)
  }

  async function resetPin() {
    try {
      await clearPin(editing.id)
      setConfirmPin(false)
      toast('PIN reseteado · lo creará al entrar')
    } catch { toast('No se pudo resetear el PIN', 'error') }
  }

  async function save() {
    if (!name.trim()) { toast('Pon un nombre', 'error'); return }
    setBusy(true)
    try {
      // El admin nunca tiene geocerca (ficha desde cualquier sitio).
      const geofencedFinal = role === 'admin' ? false : geofenced
      const fields = { name: name.trim(), role, color, birth_date: birthDate || null, geofenced: geofencedFinal }
      if (editing) await updateEmployee(editing.id, fields)
      else await createEmployee(fields)
      toast(editing ? 'Perfil actualizado ✓' : 'Perfil creado ✓')
      onClose()
      onSaved?.()
    } catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar perfil' : 'Nuevo perfil'}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Nombre</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Laura Gómez"
        className="mb-4 field"
      />

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Rol</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_ORDER.map((r) => {
          const Icon = ROLE_META[r].icon
          return (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex items-center gap-1.5 min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
                role === r ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'
              }`}
            >
              <Icon size={15} /> {ROLE_META[r].label}
            </button>
          )
        })}
      </div>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Color del avatar</label>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={`h-10 w-10 rounded-full transition active:scale-90 ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-sand-50' : ''}`}
            style={{ background: c }}
          />
        ))}
        <span className="ml-auto"><Avatar emp={{ name: name || '?', color }} size={40} /></span>
      </div>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Fecha de nacimiento</label>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="mb-1.5 field"
      />
      <p className="mb-5 px-1 text-xs text-ink/40">El día de su cumpleaños recibirá una felicitación de Baktun 13.</p>

      {/* Geocerca de fichaje: el admin queda exento (ficha desde cualquier sitio) */}
      {role !== 'admin' && (
        <button
          type="button"
          onClick={() => setGeofenced((v) => !v)}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left transition active:scale-[0.99]"
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${geofenced ? 'bg-bronze/15 text-bronze-dark' : 'bg-ink/8 text-ink/40'}`}>
            <MapPin size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">Fichar solo en el gimnasio</span>
            <span className="block text-xs text-ink/45">
              {geofenced ? 'Solo podrá fichar dentro de la geocerca del club' : 'Podrá fichar desde cualquier ubicación'}
            </span>
          </span>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${geofenced ? 'bg-sage' : 'bg-ink/15'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${geofenced ? 'left-6' : 'left-1'}`} />
          </span>
        </button>
      )}
      {role === 'admin' && (
        <p className="mb-5 flex items-center gap-2 px-1 text-xs text-ink/45">
          <MapPin size={14} /> Los perfiles de administración fichan sin restricción de ubicación.
        </p>
      )}

      <button
        onClick={save}
        disabled={busy}
        className="btn-primary"
      >
        {editing ? 'Guardar cambios' : 'Crear perfil'}
      </button>

      {editing && (
        confirmPin ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-terracotta/8 p-2">
            <span className="flex-1 px-2 text-sm font-semibold text-terracotta">¿Resetear su PIN?</span>
            <button onClick={() => setConfirmPin(false)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink/60 transition-enter active:scale-95">Cancelar</button>
            <button onClick={resetPin} className="rounded-xl bg-terracotta px-3 py-2 text-sm font-extrabold text-white transition-enter active:scale-95">Resetear</button>
          </div>
        ) : (
          <button onClick={() => setConfirmPin(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-ink/55 transition-enter active:scale-95">
            <Key size={16} /> Resetear PIN
          </button>
        )
      )}
    </Sheet>
  )
}

export default function AdminTeam() {
  const { employee: me } = useSession()
  const toast = useToast()
  const emp = useData(listAllEmployees, [])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null) // perfil a desactivar
  const [geofenceOpen, setGeofenceOpen] = useState(false)
  const [timesFor, setTimesFor] = useState(null) // empleado cuyo fichaje se corrige

  // Catch-up: cierra turnos olvidados de días anteriores al abrir el equipo.
  useEffect(() => { reconcileOpenShifts().catch(() => {}) }, [])

  const all = emp.data || []
  const active = all.filter((e) => e.active)
  const inactive = all.filter((e) => !e.active)

  function openNew() { setEditing(null); setEditorOpen(true) }
  function openEdit(e) { setEditing(e); setEditorOpen(true) }

  async function confirmDeactivate() {
    const e = confirming
    setConfirming(null)
    try {
      await deactivateEmployee(e.id)
      await emp.reload(true)
      toast('Perfil desactivado')
    } catch { toast('No se pudo desactivar', 'error') }
  }

  async function reactivate(e) {
    try {
      await updateEmployee(e.id, { active: true })
      await emp.reload(true)
      toast('Perfil reactivado ✓')
    } catch { toast('No se pudo reactivar', 'error') }
  }

  return (
    <div className="space-y-5 pb-24">
      <SectionTitle
        icon={User}
        right={
          <button onClick={openNew} className="flex min-h-[44px] items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-bold text-white transition-enter active:scale-95">
            <Plus size={13} /> Añadir
          </button>
        }
      >
        Equipo · perfiles
      </SectionTitle>

      {/* Geocerca del gimnasio: punto y radio donde el equipo puede fichar */}
      <button
        onClick={() => setGeofenceOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-ink/[0.05] transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark"><MapPin size={20} /></span>
        <span className="flex-1">
          <span className="block font-semibold text-ink">Geocerca del gimnasio</span>
          <span className="block text-xs text-ink/45">Define dónde y con qué radio puede fichar el equipo</span>
        </span>
      </button>

      {emp.loading ? (
        <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div>
      ) : active.length === 0 ? (
        <EmptyState icon={User} title="Sin perfiles" subtitle="Añade el primer perfil del equipo." />
      ) : (
        ROLE_ORDER.map((r) => {
          const list = active.filter((e) => e.role === r)
          if (!list.length) return null
          const Icon = ROLE_META[r].icon
          return (
            <CollapsibleSection key={r} icon={Icon} title={ROLE_META[r].label} right={<CountBadge tone="ink">{list.length}</CountBadge>} persistKey={`b13.team.${r}`}>
              <Card className="divide-y divide-ink/[0.06]">
                {list.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3">
                    <button onClick={() => openEdit(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
                      <Avatar emp={e} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{e.name}{isBirthdayToday(e.birth_date) && <span title="Hoy es su cumpleaños"> 🎂</span>}{e.id === me?.id && <span className="ml-1.5 text-xs font-normal text-ink/35">(tú)</span>}</p>
                        <p className="text-xs text-ink/40">Toca para editar</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setTimesFor(e)}
                      aria-label={`Corregir fichajes de ${e.name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/55 transition active:scale-90"
                    >
                      <Clock size={18} />
                    </button>
                    {e.id !== me?.id && (
                      <button
                        onClick={() => setConfirming(e)}
                        aria-label={`Desactivar a ${e.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-terracotta transition active:scale-90"
                      >
                        <Trash size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            </CollapsibleSection>
          )
        })
      )}

      {inactive.length > 0 && (
        <CollapsibleSection icon={Power} title="Desactivados" right={<CountBadge tone="ink">{inactive.length}</CountBadge>} persistKey="b13.team.inactivos" defaultOpen={false}>
          <Card className="divide-y divide-ink/[0.06]">
            {inactive.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 opacity-70">
                <Avatar emp={e} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{e.name}</p>
                  <p className="text-xs capitalize text-ink/40">{ROLE_META[e.role]?.short || e.role}</p>
                </div>
                <button
                  onClick={() => reactivate(e)}
                  className="flex items-center gap-1.5 rounded-xl bg-sage/12 px-3 py-2 text-sm font-bold text-sage transition active:scale-95"
                >
                  <Power size={16} /> Reactivar
                </button>
              </div>
            ))}
          </Card>
        </CollapsibleSection>
      )}

      <EmployeeEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSaved={() => emp.reload(true)}
      />

      <GeofenceEditor open={geofenceOpen} onClose={() => setGeofenceOpen(false)} />
      <TimeEntriesEditor open={!!timesFor} onClose={() => setTimesFor(null)} employee={timesFor} />

      <ConfirmSheet
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={confirmDeactivate}
        title="Desactivar perfil"
        message={confirming ? `${confirming.name} dejará de aparecer en la app y no podrá fichar ni recibir tareas. Su histórico se conserva y puedes reactivarlo cuando quieras.` : ''}
        confirmLabel="Desactivar"
        tone="danger"
      />
    </div>
  )
}
