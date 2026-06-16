import { useState } from 'react'
import { loginList, setPin, verifyPin, uploadPhoto, updateEmployee } from '../lib/api'
import { useData } from '../lib/useData'
import { useSession } from '../state/session'
import { useToast } from '../components/Toast'
import { Wordmark } from '../components/Logo'
import { FullLoader, Avatar } from '../components/ui'
import PinPad from '../components/PinPad'
import PhotoPicker from '../components/PhotoPicker'
import { Key, Spray, Wrench, Dumbbell, Settings, Chevron } from '../components/icons'

const ROLE_META = {
  admin: { label: 'Administración', icon: Settings, desc: 'Control total del gimnasio' },
  coach: { label: 'Coaches', icon: Dumbbell, desc: 'Agenda, fichaje y sala' },
  cleaning: { label: 'Limpieza', icon: Spray, desc: 'Ruta y avisos' },
  maintenance: { label: 'Mantenimiento', icon: Wrench, desc: 'Incidencias y reparaciones' },
}
const ORDER = ['admin', 'coach', 'cleaning', 'maintenance']

export default function RoleSwitcher() {
  const { data: employees, loading } = useData(loginList, [])
  const { login } = useSession()
  const toast = useToast()

  const [sel, setSel] = useState(null)        // empleado elegido (paso 2)
  const [phase, setPhase] = useState('first') // crear PIN: 'first' | 'confirm'
  const [firstPin, setFirstPin] = useState('')
  const [reset, setReset] = useState(0)
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [photoFor, setPhotoFor] = useState(null) // empleado al que pedir foto (primer acceso)

  function bump() { setReset((r) => r + 1) }
  function doShake() { setShake(true); setTimeout(() => setShake(false), 450); bump() }

  function pickEmployee(emp) {
    setSel(emp); setPhase('first'); setFirstPin(''); setAttempts(0); setLocked(false); bump()
  }
  function back() { setSel(null); setFirstPin(''); setPhase('first') }

  function enterApp(emp, extra = {}) {
    login({ id: emp.id, name: emp.name, role: emp.role, color: emp.color, photo_url: emp.photo_url || null, geofenced: emp.geofenced ?? true, ...extra })
  }

  async function handleComplete(pin) {
    if (!sel) return
    if (!sel.has_pin) {
      if (phase === 'first') { setFirstPin(pin); setPhase('confirm'); bump(); return }
      if (pin !== firstPin) {
        toast('Los PIN no coinciden, prueba otra vez', 'error')
        setPhase('first'); setFirstPin(''); doShake(); return
      }
      setBusy(true)
      try {
        const ok = await setPin(sel.id, pin)
        if (ok) { toast('PIN creado ✓'); setPhotoFor(sel) } // primer acceso → pedir foto
        else { toast('No se pudo crear el PIN', 'error'); setPhase('first'); setFirstPin(''); bump() }
      } catch { toast('No se pudo crear el PIN', 'error') } finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      const ok = await verifyPin(sel.id, pin)
      if (ok) { enterApp(sel) }
      else {
        const n = attempts + 1
        setAttempts(n); doShake()
        if (n >= 5) {
          setLocked(true); toast('Demasiados intentos. Espera 30 s', 'error')
          setTimeout(() => { setLocked(false); setAttempts(0) }, 30000)
        } else { toast('PIN incorrecto', 'error') }
      }
    } catch { toast('No se pudo comprobar el PIN', 'error') } finally { setBusy(false) }
  }

  async function savePhoto(file) {
    if (!file || !photoFor) return
    setBusy(true)
    try {
      const url = await uploadPhoto(file, 'profiles')
      await updateEmployee(photoFor.id, { photo_url: url })
      toast('Foto guardada ✓')
      enterApp(photoFor, { photo_url: url })
    } catch { toast('No se pudo subir la foto, puedes ponerla luego', 'error'); enterApp(photoFor) }
    finally { setBusy(false) }
  }

  if (loading) return <FullLoader />

  const byRole = (role) => (employees || []).filter((e) => e.role === role)

  // -------- Paso 3: foto de perfil (primer acceso) --------
  if (photoFor) {
    return (
      <div className="scene-dark min-h-dvh text-white">
        <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-16 pt-safe text-center">
          <div className="pt-12"><Wordmark variant="white" className="h-6 w-auto" /></div>
          <div className="my-10 flex flex-col items-center">
            <Avatar emp={photoFor} size={96} className="ring-4 ring-white/10" />
            <p className="mt-5 font-display text-2xl font-extrabold">Tu foto de perfil</p>
            <p className="mt-1 text-sm text-white/45">Hazte un selfie o sube una foto para que el equipo te reconozca</p>
          </div>

          <div className="w-full max-w-xs">
            <PhotoPicker tone="dark" onPhoto={savePhoto} disabled={busy} />
          </div>

          <button onClick={() => enterApp(photoFor)} disabled={busy} className="mt-6 text-sm font-semibold text-white/50 active:text-white/80">
            Ahora no, lo pongo luego
          </button>
        </div>
      </div>
    )
  }

  // -------- Paso 2: PIN --------
  if (sel) {
    const creating = !sel.has_pin
    const title = creating
      ? (phase === 'first' ? 'Crea tu PIN' : 'Repite tu PIN')
      : `Hola, ${sel.name.split(' ')[0]}`
    const subtitle = locked
      ? 'Bloqueado 30 s por seguridad'
      : creating
        ? (phase === 'first' ? '4 dígitos que recordarás' : 'Confírmalo para guardarlo')
        : 'Introduce tu PIN'
    return (
      <div className="scene-dark min-h-dvh text-white">
        <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-16 pt-safe">
          <div className="pt-12"><Wordmark variant="white" className="h-6 w-auto" /></div>
          <div className="mb-8 mt-10 flex items-center gap-3">
            <Avatar emp={sel} size={44} />
            <p className="font-bold">{sel.name}</p>
          </div>
          <PinPad
            tone="dark"
            title={title}
            subtitle={subtitle}
            onComplete={handleComplete}
            onBack={back}
            resetSignal={reset}
            shake={shake}
            disabled={busy || locked}
          />
        </div>
      </div>
    )
  }

  // -------- Paso 1: elegir perfil --------
  return (
    <div className="scene-dark min-h-dvh text-white">
      <div className="mx-auto max-w-md px-6 pb-16 pt-safe">
        <div className="flex flex-col items-center pt-16 text-center">
          <Wordmark variant="white" className="h-8 w-auto" />
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">Operativa interna</p>
          <p className="mt-1 text-sm text-white/55">Selecciona tu perfil</p>
          <span className="glass mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold text-white/55 ring-1 ring-white/10">
            <Key size={12} className="text-bronze-glow" /> Acceso con PIN personal
          </span>
        </div>

        <div className="mt-10 space-y-7">
          {ORDER.map((role) => {
            const list = byRole(role)
            if (!list.length) return null
            const meta = ROLE_META[role]
            const Icon = meta.icon
            return (
              <div key={role}>
                <div className="mb-2.5 flex items-center gap-2.5 px-1 text-white/60">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bronze/20 text-bronze-glow">
                    <Icon size={15} />
                  </span>
                  <h2 className="font-display text-xl font-bold">{meta.label}</h2>
                </div>
                <div className="space-y-2.5">
                  {list.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => pickEmployee(emp)}
                      className="glass flex w-full items-center gap-3 rounded-2xl bg-white/[0.07] p-3 text-left ring-1 ring-white/[0.09] transition active:scale-[0.98] hover:bg-white/10"
                    >
                      <Avatar emp={emp} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{emp.name}</p>
                        <p className="text-xs text-white/45">{emp.has_pin ? meta.desc : 'Primer acceso · crea tu PIN'}</p>
                      </div>
                      <Chevron size={18} className="text-white/30" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
