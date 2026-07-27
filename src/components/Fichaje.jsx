import { useEffect, useRef, useState } from 'react'
import { addTimeEntry, deriveStatus, todayEntries, getGeofence, KIND_LABEL } from '../lib/api'
import { useData } from '../lib/useData'
import { timeHM } from '../lib/date'
import { fmtMinutes, workedMinutesForDay } from '../lib/hours'
import { isGeofenced, fenceActive, getPosition, evaluate, watchAway, geoErrorMessage } from '../lib/geo'
import { haptic } from '../lib/haptics'
import { ConfirmSheet } from './ui'
import Sheet from './Sheet'
import { useToast } from './Toast'
import { Power, Coffee, Utensils, Clock, LogOut, MapPin, ChevronDown } from './icons'

const STATUS_META = {
  out: { label: 'Sin fichar', color: 'text-ink/40', dot: 'bg-ink/25' },
  working: { label: 'En turno', color: 'text-sage', dot: 'bg-sage' },
  break: { label: 'En pausa', color: 'text-ochre', dot: 'bg-ochre' },
  meal: { label: 'En comida', color: 'text-stone', dot: 'bg-stone' },
}

const EVENT_META = {
  clock_in: { dot: 'bg-sage', icon: Power },
  clock_out: { dot: 'bg-terracotta', icon: LogOut },
  break_start: { dot: 'bg-ochre', icon: Coffee },
  break_end: { dot: 'bg-sage', icon: Power },
  meal_start: { dot: 'bg-stone', icon: Utensils },
  meal_end: { dot: 'bg-sage', icon: Power },
}

// Cronómetro en vivo del turno (HH:MM:SS), descontando pausas/comidas como en hours.js.
function elapsedMs(entries, now) {
  if (!entries || entries.length === 0) return 0
  const sorted = [...entries].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
  const t = (e) => new Date(e.occurred_at).getTime()
  const ci = sorted.find((e) => e.kind === 'clock_in')
  if (!ci) return 0
  const co = [...sorted].reverse().find((e) => e.kind === 'clock_out')
  const start = t(ci)
  const end = co ? t(co) : now
  if (end <= start) return 0
  let paused = 0, open = null
  for (const e of sorted) {
    if (e.kind === 'break_start' || e.kind === 'meal_start') open = t(e)
    if ((e.kind === 'break_end' || e.kind === 'meal_end') && open != null) { paused += Math.max(0, t(e) - open); open = null }
  }
  if (open != null) paused += Math.max(0, end - open)
  return Math.max(0, end - start - paused)
}

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

function ActionBtn({ icon: Icon, label, onClick, tone = 'ink', disabled }) {
  const tones = {
    ink: 'bg-ink text-white',
    sage: 'bg-sage text-white',
    ochre: 'bg-ochre/15 text-[#8a6a1e]',
    stone: 'bg-stone/15 text-stone',
    ghost: 'bg-ink/5 text-ink/70',
    danger: 'bg-terracotta/12 text-terracotta',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[13px] font-bold transition active:scale-95 disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon size={22} />
      {label}
    </button>
  )
}

function ShiftDetail({ entries = [], live, status, now }) {
  const sorted = [...entries].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
  const firstIn = sorted.find((e) => e.kind === 'clock_in')
  const lastOut = [...sorted].reverse().find((e) => e.kind === 'clock_out')
  const total = live ? fmtClock(elapsedMs(sorted, now)) : fmtMinutes(workedMinutesForDay(sorted, now))
  const endLabel = live
    ? status === 'break' ? 'En pausa' : status === 'meal' ? 'En comida' : 'En curso'
    : lastOut ? timeHM(lastOut.occurred_at) : 'Sin salida'

  return (
    <div>
      <div className="grid grid-cols-3 divide-x divide-ink/[0.08] rounded-2xl bg-white px-2 py-3 ring-1 ring-ink/[0.06]">
        <div className="px-2 text-center">
          <p className="text-xs font-semibold text-ink/40">Entrada</p>
          <p className="tabular mt-0.5 font-display text-xl font-extrabold text-ink">{firstIn ? timeHM(firstIn.occurred_at) : '—'}</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-xs font-semibold text-ink/40">{live ? 'Estado' : 'Salida'}</p>
          <p className={`tabular mt-0.5 font-display text-xl font-extrabold ${live ? 'text-sage' : 'text-ink'}`}>{endLabel}</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-xs font-semibold text-ink/40">Trabajado</p>
          <p className="tabular mt-0.5 font-display text-xl font-extrabold text-ink">{total}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 px-1 text-xs font-bold uppercase text-ink/40">Cronología de hoy</p>
        <div className="rounded-2xl bg-white px-4 py-2 ring-1 ring-ink/[0.06]">
          {sorted.map((entry, index) => {
            const event = EVENT_META[entry.kind] || { dot: 'bg-ink/25', icon: Clock }
            const Icon = event.icon
            return (
              <div key={entry.id || `${entry.kind}-${entry.occurred_at}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-3 flex h-8 w-8 items-center justify-center rounded-full text-white ${event.dot}`}>
                    <Icon size={15} />
                  </span>
                  {index < sorted.length - 1 && <span className="w-px flex-1 bg-ink/10" />}
                </div>
                <div className="min-w-0 flex-1 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold text-ink">{KIND_LABEL[entry.kind] || entry.kind}</p>
                    <p className="tabular shrink-0 font-bold text-ink/60">{timeHM(entry.occurred_at)}</p>
                  </div>
                  {(entry.notes || entry.auto_closed || entry.inside === true) && (
                    <p className="mt-0.5 text-sm text-ink/45">
                      {entry.auto_closed ? 'Salida automática por alejamiento' : entry.notes || 'Ubicación del gimnasio verificada'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Fichaje({ employee, onChange }) {
  if (employee?.requires_time_tracking === false) return null
  return <FichajeTracker employee={employee} onChange={onChange} />
}

function FichajeTracker({ employee, onChange }) {
  const { data: entries, reload } = useData(() => todayEntries(employee.id), [employee.id], { interval: 60000 })
  const { data: fence } = useData(getGeofence, [])
  const [busy, setBusy] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [manageOpen, setManageOpen] = useState(false) // sheet de acciones en modo comprimido
  const [now, setNow] = useState(Date.now())
  const [geoMsg, setGeoMsg] = useState(null) // aviso de geocerca bajo la tarjeta
  const toast = useToast()
  const autoClosing = useRef(false)

  // ¿Se aplica geocerca a este empleado y está configurada? (admin nunca)
  const geoOn = isGeofenced(employee) && fenceActive(fence)

  const status = deriveStatus(entries || [])
  const clockInEntry = (entries || []).find((e) => e.kind === 'clock_in')
  const finished = status === 'out' && clockInEntry // ya fichó entrada hoy y salió
  const meta = finished
    ? { label: 'Jornada terminada', color: 'text-white/70', dot: 'bg-white/40' }
    : STATUS_META[status]

  // Ticker de segundos solo mientras el turno está activo (no malgasta renders parado).
  useEffect(() => {
    if (status === 'out') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [status])

  const live = status === 'working' || status === 'break' || status === 'meal'
  const worked = live ? fmtClock(elapsedMs(entries || [], now)) : null
  const finishedTotal = finished ? fmtMinutes(workedMinutesForDay(entries || [])) : null

  async function act(kind, msg, geo = null, extra = {}) {
    if (busy) return
    setBusy(true)
    try {
      await addTimeEntry(employee.id, kind, null, geo, extra)
      await reload(true)
      onChange?.()
      toast(msg)
    } catch {
      toast('No se pudo fichar', 'error')
    } finally {
      setBusy(false)
    }
  }

  // Fichar entrada: si el empleado tiene geocerca, debe estar dentro del radio.
  async function clockIn() {
    if (busy) return
    if (!geoOn) return act('clock_in', 'Entrada fichada')
    setBusy(true)
    setGeoMsg(null)
    try {
      const pos = await getPosition()
      const ev = evaluate(pos, fence)
      if (!ev.inside) {
        haptic('error')
        const m = Math.round(ev.distance)
        setGeoMsg(`Estás a ~${m > 999 ? (m / 1000).toFixed(1) + ' km' : m + ' m'} del gimnasio. Acércate para fichar.`)
        toast('Fuera del gimnasio: no puedes fichar', 'error')
        setBusy(false)
        return
      }
      setBusy(false)
      await act('clock_in', 'Entrada fichada', { ...pos, inside: true })
    } catch (e) {
      haptic('error')
      setGeoMsg(geoErrorMessage(e.code))
      toast('No se pudo verificar tu ubicación', 'error')
      setBusy(false)
    }
  }

  // Cierre automático cuando el empleado se aleja del gimnasio (turno en curso).
  async function autoClockOut(pos) {
    if (autoClosing.current) return
    autoClosing.current = true
    haptic('warning')
    try {
      await addTimeEntry(employee.id, 'clock_out',
        'Cierre automático: te alejaste del gimnasio',
        pos ? { ...pos, inside: false } : null,
        { auto_closed: true })
      await reload(true)
      onChange?.()
      toast('Te has alejado del gimnasio · jornada cerrada', 'error')
    } catch { /* reintenta en la próxima lectura */ autoClosing.current = false }
  }

  // Vigilancia de alejamiento mientras hay turno abierto (solo geofenced).
  useEffect(() => {
    if (!geoOn || status === 'out') return
    autoClosing.current = false
    const stop = watchAway(fence, {
      onWarn: (d) => {
        setGeoMsg(`Te estás alejando del gimnasio (~${Math.round(d)} m). Si sales, tu fichaje se cerrará solo.`)
        haptic('warning')
      },
      onLeave: (pos) => autoClockOut(pos),
      onUpdate: ({ inside }) => { if (inside) setGeoMsg(null) },
    })
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoOn, status, fence])

  const confirm = (
    <ConfirmSheet
      open={confirmOut}
      onClose={() => setConfirmOut(false)}
      onConfirm={() => act('clock_out', 'Salida fichada')}
      title="¿Fichar salida?"
      message="Se cerrará tu jornada de hoy. Si aún no has terminado, puedes seguir en turno."
      confirmLabel="Fichar salida"
      tone="danger"
    />
  )

  const shiftSheet = (
    <Sheet open={manageOpen} onClose={() => setManageOpen(false)} title="Jornada de hoy">
      <ShiftDetail entries={entries || []} live={live} status={status} now={now} />

      {live && (
        <div className="mt-5 border-t border-ink/[0.08] pt-5">
          <p className="mb-2 px-1 text-xs font-bold uppercase text-ink/40">Acciones</p>
          {status === 'working' && (
            <div className="flex gap-2 pb-2">
              <ActionBtn icon={Coffee} label="Pausa" tone="ochre" onClick={() => { setManageOpen(false); act('break_start', 'Pausa iniciada') }} disabled={busy} />
              <ActionBtn icon={Utensils} label="Comida" tone="stone" onClick={() => { setManageOpen(false); act('meal_start', 'Comida iniciada') }} disabled={busy} />
              <ActionBtn icon={LogOut} label="Salir" tone="danger" onClick={() => { setManageOpen(false); setConfirmOut(true) }} disabled={busy} />
            </div>
          )}
          {status === 'break' && (
            <button
              onClick={() => { setManageOpen(false); act('break_end', 'De vuelta al turno') }}
              disabled={busy}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-lg font-extrabold text-white transition-enter active:scale-95 disabled:opacity-50"
            >
              <Power size={24} /> Terminar pausa
            </button>
          )}
          {status === 'meal' && (
            <button
              onClick={() => { setManageOpen(false); act('meal_end', 'De vuelta al turno') }}
              disabled={busy}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-lg font-extrabold text-white transition-enter active:scale-95 disabled:opacity-50"
            >
              <Power size={24} /> Terminar comida
            </button>
          )}
        </div>
      )}
    </Sheet>
  )

  // ── Turno activo: barra COMPRIMIDA. El fichaje ya está hecho; cede el
  // protagonismo al día y las acciones (pausa/comida/salir) viven en un sheet.
  if (live) {
    return (
      <>
        <button
          onClick={() => { haptic('tap'); setManageOpen(true) }}
          aria-label={`${meta.label}. Ver jornada y acciones`}
          className="relative flex min-h-[56px] w-full items-center gap-3 overflow-hidden rounded-xl2 bg-ink px-4 text-left text-white shadow-card transition-enter active:scale-[0.98]"
        >
          <div className="brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <span className={`relative h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot} animate-pulse`} />
          <span className="relative min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{meta.label}</span>
            {clockInEntry && (
              <span className="block text-[11px] text-white/50">desde {timeHM(clockInEntry.occurred_at)}</span>
            )}
          </span>
          <span className="tabular relative font-display text-xl font-extrabold tracking-tight">{worked}</span>
          <ChevronDown size={16} className="relative shrink-0 -rotate-90 text-white/40" />
        </button>

        {/* Aviso de geocerca aunque la barra esté comprimida */}
        {geoOn && geoMsg && (
          <div className="mt-2 flex items-start gap-2 rounded-2xl bg-terracotta/10 px-3 py-2.5 text-[13px] font-semibold text-terracotta ring-1 ring-terracotta/25">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>{geoMsg}</span>
          </div>
        )}

        {shiftSheet}
        {confirm}
      </>
    )
  }

  // ── Sin fichar (o jornada terminada): el fichaje es el protagonista.
  return (
    <div className="relative overflow-hidden rounded-xl2 bg-ink p-4 text-white shadow-card">
      <div className="brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span className="font-display text-xl font-bold">{meta.label}</span>
        </div>
        {clockInEntry && (
          <span className="flex items-center gap-1 text-xs text-white/55">
            <Clock size={13} /> entrada {timeHM(clockInEntry.occurred_at)}
          </span>
        )}
      </div>

      {finishedTotal && (
        <div className="relative mb-3 flex items-baseline gap-2">
          <span className="tabular font-display text-4xl font-extrabold leading-none tracking-tight">{finishedTotal}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">trabajadas hoy</span>
        </div>
      )}

      {finished && (
        <button
          type="button"
          onClick={() => { haptic('tap'); setManageOpen(true) }}
          className="relative mb-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 font-bold text-white active:scale-[0.98]"
        >
          <Clock size={18} /> Ver jornada
        </button>
      )}

      <button
        onClick={clockIn}
        disabled={busy}
        className={`relative flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-extrabold transition-enter active:scale-95 disabled:opacity-50 ${
          finished ? 'bg-white/10 text-base text-white/80' : 'bg-sage text-lg text-white'
        }`}
      >
        {geoOn ? <MapPin size={22} /> : <Power size={24} />}
        {busy && geoOn ? 'Comprobando ubicación…' : finished ? 'Volver a fichar entrada' : 'Fichar entrada'}
      </button>

      {/* Aviso de geocerca: fuera de radio, alejándose, o error de ubicación */}
      {geoOn && geoMsg && (
        <div className="relative mt-3 flex items-start gap-2 rounded-2xl bg-terracotta/15 px-3 py-2.5 text-[13px] font-semibold text-white/90 ring-1 ring-terracotta/30">
          <MapPin size={16} className="mt-0.5 shrink-0 text-terracotta" />
          <span>{geoMsg}</span>
        </div>
      )}
      {geoOn && !geoMsg && (
        <p className="relative mt-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-white/45">
          <MapPin size={13} /> Fichaje activado por ubicación del gimnasio
        </p>
      )}

      {finished && shiftSheet}
      {confirm}
    </div>
  )
}
