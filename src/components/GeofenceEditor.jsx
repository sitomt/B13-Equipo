import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { getGeofence, updateGeofence } from '../lib/api'
import { getPosition, geoErrorMessage } from '../lib/geo'
import { useToast } from './Toast'
import { MapPin, Check } from './icons'

// Configuración de la geocerca del gimnasio: punto central + radio/buffer/gracia.
// El admin fija el centro con "Usar mi ubicación actual" estando en el club.
export default function GeofenceEditor({ open, onClose }) {
  const toast = useToast()
  const [fence, setFence] = useState(null)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState(150)
  const [buffer, setBuffer] = useState(60)
  const [grace, setGrace] = useState(300)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!open) return
    getGeofence().then((f) => {
      setFence(f)
      setLat(f?.lat ?? ''); setLng(f?.lng ?? '')
      setRadius(f?.radius_m ?? 150); setBuffer(f?.buffer_m ?? 60); setGrace(f?.grace_seconds ?? 300)
    }).catch(() => {})
  }, [open])

  async function useMyLocation() {
    setLocating(true)
    try {
      const pos = await getPosition()
      setLat(pos.lat.toFixed(6)); setLng(pos.lng.toFixed(6))
      toast('Ubicación capturada · ya puedes guardar')
    } catch (e) { toast(geoErrorMessage(e.code), 'error') }
    finally { setLocating(false) }
  }

  async function save() {
    if (lat === '' || lng === '') { toast('Fija primero el punto del gimnasio', 'error'); return }
    setBusy(true)
    try {
      await updateGeofence({
        lat: Number(lat), lng: Number(lng),
        radius_m: Number(radius) || 150,
        buffer_m: Number(buffer) || 0,
        grace_seconds: Number(grace) || 0,
      })
      toast('Geocerca guardada ✓')
      onClose()
    } catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }

  const active = lat !== '' && lng !== ''

  return (
    <Sheet open={open} onClose={onClose} title="Geocerca del gimnasio">
      <p className="mb-4 text-sm text-ink/55">
        Define el punto y el radio dentro del cual el equipo puede fichar. Colócate
        físicamente en el gimnasio y pulsa el botón para fijar el centro.
      </p>

      <button
        onClick={useMyLocation}
        disabled={locating}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        <MapPin size={20} /> {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
      </button>

      {active && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-sage/10 px-3 py-2.5 text-sm font-semibold text-sage">
          <Check size={16} /> Centro fijado: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/40">Radio (m)</span>
          <input type="number" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/40">Margen (m)</span>
          <input type="number" inputMode="numeric" value={buffer} onChange={(e) => setBuffer(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/40">Gracia (s)</span>
          <input type="number" inputMode="numeric" value={grace} onChange={(e) => setGrace(e.target.value)} className="field" />
        </label>
      </div>
      <p className="mb-5 px-1 text-xs text-ink/40">
        <b>Radio</b>: distancia máxima para fichar. <b>Margen</b>: holgura extra antes de
        considerar que se ha ido. <b>Gracia</b>: segundos fuera antes de cerrar el turno solo.
      </p>

      <button onClick={save} disabled={busy} className="btn-primary">Guardar geocerca</button>

      {!active && (
        <p className="mt-3 text-center text-xs text-ink/40">
          Mientras no fijes el punto, la geocerca está inactiva y nadie queda bloqueado.
        </p>
      )}
    </Sheet>
  )
}
