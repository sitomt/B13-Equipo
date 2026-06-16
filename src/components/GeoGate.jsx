import { useEffect, useState, useCallback } from 'react'
import { getGeofence, todayEntries } from '../lib/api'
import { deriveStatus } from '../lib/api'
import { useData } from '../lib/useData'
import { isGeofenced, fenceActive, getPosition, evaluate, geoErrorMessage } from '../lib/geo'
import { Spinner } from './ui'
import { MapPin } from './icons'
import { Wordmark } from './Logo'

// Puerta de ubicación: para empleados con geocerca, las zonas de trabajo solo
// se desbloquean estando físicamente dentro del radio del gimnasio.
// Excepciones: el admin nunca se bloquea; y si ya hay un turno ABIERTO se
// confía en que está dentro (un pico de GPS no debe echarle a media jornada).
export default function GeoGate({ employee, children }) {
  const { data: fence, loading: fenceLoading } = useData(getGeofence, [])
  const { data: entries } = useData(() => todayEntries(employee.id), [employee.id], { interval: 60000 })
  const [state, setState] = useState('checking') // checking | inside | outside | error
  const [info, setInfo] = useState(null)          // { distance } | { code }

  const geoOn = isGeofenced(employee) && fenceActive(fence)
  const hasOpenShift = deriveStatus(entries || []) !== 'out'

  const check = useCallback(async () => {
    setState('checking')
    try {
      const pos = await getPosition()
      const ev = evaluate(pos, fence)
      if (ev.inside) { setState('inside'); setInfo(null) }
      else { setState('outside'); setInfo({ distance: ev.distance }) }
    } catch (e) {
      setState('error'); setInfo({ code: e.code })
    }
  }, [fence])

  useEffect(() => {
    if (!geoOn || hasOpenShift) return
    check()
    const id = setInterval(check, 60000) // re-verifica por si llega andando
    return () => clearInterval(id)
  }, [geoOn, hasOpenShift, check])

  // Sin geocerca, fence sin configurar, o turno ya abierto → acceso normal.
  if (!geoOn || hasOpenShift) return children
  if (fenceLoading || state === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink/40">
        <Spinner className="h-7 w-7" />
        <p className="text-sm font-semibold">Comprobando que estás en el gimnasio…</p>
      </div>
    )
  }
  if (state === 'inside') return children

  // Bloqueado: fuera del radio o sin ubicación.
  const dist = info?.distance
  const distLabel = dist != null ? (dist > 999 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`) : null
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-terracotta/12 text-terracotta">
        <MapPin size={38} />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold text-ink">Acércate al gimnasio</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink/55">
          {state === 'error'
            ? geoErrorMessage(info?.code)
            : `Tu acceso se desbloquea dentro del club.${distLabel ? ` Estás a ~${distLabel}.` : ''}`}
        </p>
      </div>
      <button
        onClick={check}
        className="rounded-2xl bg-ink px-6 py-3.5 font-extrabold text-white transition active:scale-[0.97]"
      >
        Volver a comprobar
      </button>
      <div className="mt-2 opacity-30"><Wordmark className="h-4 w-auto" /></div>
    </div>
  )
}
