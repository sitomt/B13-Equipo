import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import PinPad from './PinPad'
import PhotoPicker from './PhotoPicker'
import { Avatar } from './ui'
import { uploadPhoto, updateEmployee, changePin } from '../lib/api'
import { enablePush, notificationsEnabled, pushSupported } from '../lib/push'
import { useToast } from './Toast'
import { useSession } from '../state/session'
import { Key, Chevron, Camera, Bell, Check, Book } from './icons'

// Ajustes de la cuenta del propio empleado: cambiar foto de perfil y cambiar PIN.
// Un único Sheet con dos modos (menú | pin) para no anidar hojas.
export default function AccountSheet({ open, onClose, employee }) {
  const toast = useToast()
  const { login } = useSession()
  const [mode, setMode] = useState('menu') // 'menu' | 'photo' | 'pin'
  const [busy, setBusy] = useState(false)

  // --- notificaciones push ---
  const [notifOn, setNotifOn] = useState(false)
  const [notifBusy, setNotifBusy] = useState(false)
  useEffect(() => {
    if (open) notificationsEnabled().then(setNotifOn).catch(() => setNotifOn(false))
  }, [open])

  async function activateNotifs() {
    if (notifOn || notifBusy) return
    setNotifBusy(true)
    try {
      await enablePush(employee)
      setNotifOn(true)
      toast('Notificaciones activadas ✓')
    } catch (e) {
      if (e.message === 'denied') toast('Permiso denegado. Actívalo en los ajustes del móvil.', 'error')
      else if (e.message === 'ios-install') toast('En iPhone: añade la app a la pantalla de inicio y ábrela desde ahí.', 'error')
      else toast('Este dispositivo no admite notificaciones', 'error')
    } finally { setNotifBusy(false) }
  }

  // --- cambiar PIN (inline) ---
  const [step, setStep] = useState('current') // 'current' | 'new' | 'confirm'
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [reset, setReset] = useState(0)
  const [shake, setShake] = useState(false)
  function bump() { setReset((r) => r + 1) }
  function doShake() { setShake(true); setTimeout(() => setShake(false), 450); bump() }

  function close() {
    setMode('menu'); setStep('current'); setCurrent(''); setNext('')
    onClose()
  }

  async function savePhoto(file) {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadPhoto(file, 'profiles')
      await updateEmployee(employee.id, { photo_url: url })
      login({ ...employee, photo_url: url }) // refresca sesión (y avatar de la cabecera)
      toast('Foto actualizada ✓'); setMode('menu')
    } catch { toast('No se pudo actualizar la foto', 'error') } finally { setBusy(false) }
  }

  async function onPinComplete(pin) {
    if (step === 'current') { setCurrent(pin); setStep('new'); bump(); return }
    if (step === 'new') { setNext(pin); setStep('confirm'); bump(); return }
    if (pin !== next) { toast('Los PIN no coinciden', 'error'); setStep('new'); setNext(''); doShake(); return }
    setBusy(true)
    try {
      const ok = await changePin(employee.id, current, pin)
      if (ok) { toast('PIN actualizado ✓'); close() }
      else { toast('El PIN actual no es correcto', 'error'); setStep('current'); setCurrent(''); setNext(''); bump() }
    } catch { toast('No se pudo cambiar el PIN', 'error') } finally { setBusy(false) }
  }

  const pinTitles = {
    current: ['PIN actual', 'Introduce tu PIN de ahora'],
    new: ['Nuevo PIN', '4 dígitos que recordarás'],
    confirm: ['Repite el nuevo PIN', 'Confírmalo para guardarlo'],
  }

  return (
    <Sheet open={open} onClose={close} title={mode === 'pin' ? 'Cambiar PIN' : mode === 'photo' ? 'Cambiar foto' : 'Mi cuenta'}>
      {mode === 'menu' && (
        <div>
          <div className="mb-5 flex flex-col items-center">
            <Avatar emp={employee} size={88} />
            <p className="mt-3 font-display text-xl font-bold text-ink">{employee?.name}</p>
          </div>

          <button
            onClick={() => setMode('photo')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark"><Camera size={20} /></span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">Cambiar foto de perfil</span>
              <span className="block text-xs text-ink/45">Selfie o subir una foto</span>
            </span>
            <Chevron size={18} className="text-ink/25" />
          </button>

          <button
            onClick={() => setMode('pin')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark"><Key size={20} /></span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">Cambiar PIN</span>
              <span className="block text-xs text-ink/45">Tu PIN de acceso de 4 dígitos</span>
            </span>
            <Chevron size={18} className="text-ink/25" />
          </button>

          {pushSupported() && (
            <button
              onClick={activateNotifs}
              disabled={notifOn || notifBusy}
              className="flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left transition active:scale-[0.99] disabled:active:scale-100"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${notifOn ? 'bg-sage/15 text-sage' : 'bg-bronze/12 text-bronze-dark'}`}><Bell size={20} /></span>
              <span className="flex-1">
                <span className="block font-semibold text-ink">{notifOn ? 'Notificaciones activadas' : 'Activar notificaciones'}</span>
                <span className="block text-xs text-ink/45">{notifOn ? 'Recibirás los avisos en este dispositivo' : 'Recibe los avisos como aviso en el móvil'}</span>
              </span>
              {notifOn ? <Check size={18} className="text-sage" /> : <Chevron size={18} className="text-ink/25" />}
            </button>
          )}

          <button
            onClick={() => { onClose(); window.dispatchEvent(new Event('b13:onboarding')) }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark"><Book size={20} /></span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">Ver tutorial</span>
              <span className="block text-xs text-ink/45">Repasa cómo funciona la app</span>
            </span>
            <Chevron size={18} className="text-ink/25" />
          </button>
        </div>
      )}

      {mode === 'photo' && (
        <div className="pb-2">
          <div className="mb-5 flex flex-col items-center">
            <Avatar emp={employee} size={96} />
            <p className="mt-3 text-sm text-ink/55">Hazte un selfie o sube una foto</p>
          </div>
          <PhotoPicker tone="light" onPhoto={savePhoto} disabled={busy} />
          <button onClick={() => setMode('menu')} className="mt-5 w-full text-sm font-semibold text-ink/55 active:text-ink">← Volver</button>
        </div>
      )}

      {mode === 'pin' && (
        <div className="pb-2 pt-1">
          <PinPad
            tone="light"
            title={pinTitles[step][0]}
            subtitle={pinTitles[step][1]}
            onComplete={onPinComplete}
            onBack={() => { setMode('menu'); setStep('current'); setCurrent(''); setNext('') }}
            resetSignal={reset}
            shake={shake}
            disabled={busy}
          />
        </div>
      )}
    </Sheet>
  )
}
