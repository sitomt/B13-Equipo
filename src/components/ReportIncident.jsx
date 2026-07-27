import { useId, useRef, useState } from 'react'
import Sheet from './Sheet'
import { createIncidencia, createMaintenance, uploadPhoto, listIncidenciaTypes, listAreas } from '../lib/api'
import { useData } from '../lib/useData'
import { useToast } from './Toast'
import { Alert, Camera, X } from './icons'

const CATS_MANT = [
  { key: 'aire', label: 'Aire acond.' },
  { key: 'puerta', label: 'Puerta' },
  { key: 'ventana', label: 'Ventana' },
  { key: 'parquet', label: 'Parquet' },
  { key: 'fontaneria', label: 'Fontanería' },
  { key: 'electricidad', label: 'Electricidad' },
  { key: 'mobiliario', label: 'Mobiliario' },
  { key: 'otro', label: 'Otro' },
]
const ZONES = ['Recepción', 'Sala principal', 'Sala spinning', 'Sala funcional', 'Vestuario hombres', 'Vestuario mujeres', 'Aseos', 'Zona de pesas']

// target: 'mantenimiento' (instalaciones, va al técnico) | 'incidencia' (interna, la ve el admin)
// heading/desc: permiten personalizar el título y la descripción de la hoja
// (p. ej. cuando el propio técnico añade una tarea, no es "avisar a mantenimiento").
export default function ReportIncident({ open, onClose, employee, onCreated, target = 'mantenimiento', heading, desc }) {
  const isMant = target === 'mantenimiento'
  // Las etiquetas de incidencia interna son editables por el admin (tabla incidencia_types).
  const types = useData(() => (isMant ? Promise.resolve([]) : listIncidenciaTypes()), [isMant])
  // Las áreas (locales de la instalación) aplican a ambos tipos de reporte.
  const areas = useData(listAreas, [])
  const CATEGORIES = isMant
    ? CATS_MANT
    : (types.data || []).map((t) => ({ key: t.label, label: t.label }))
  const sheetTitle = heading || (isMant ? 'Avisar a mantenimiento' : 'Reportar incidencia')
  const sheetDesc = desc || (isMant
    ? 'Algo roto de las instalaciones (puerta, aire, parquet…). Le llega al técnico de mantenimiento al instante.'
    : 'Cualquier incidencia del día: ruido de un vecino, un socio, material deportivo roto… Queda registrada para el admin.')
  const placeholder = isMant ? 'Ej: La puerta del vestuario no cierra' : 'Ej: Vecino se ha quejado del ruido'
  const [category, setCategory] = useState(null)
  const [area, setArea] = useState(null)
  const [zone, setZone] = useState(null)
  const [title, setTitle] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [photo, setPhoto] = useState(null) // { file, preview }
  const fileRef = useRef(null)
  const toast = useToast()
  const titleId = useId()
  const titleErrorId = `${titleId}-error`
  const hasDraft = Boolean(title.trim() || category || area || zone || urgent || photo)

  function reset() {
    setCategory(null); setArea(null); setZone(null); setTitle(''); setUrgent(false)
    setErrors({}); setConfirmingClose(false)
    if (photo?.preview) URL.revokeObjectURL(photo.preview)
    setPhoto(null)
  }

  function closeNow() {
    reset()
    onClose()
  }

  function requestClose() {
    if (confirmingClose) {
      setConfirmingClose(false)
      return
    }
    if (hasDraft && !busy) {
      setConfirmingClose(true)
      return
    }
    closeNow()
  }

  function onPickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  async function submit(e) {
    e?.preventDefault()
    const nextErrors = {
      ...(!title.trim() ? { title: 'Describe brevemente qué está pasando.' } : {}),
      ...(!area ? { area: 'Selecciona el área donde ocurre.' } : {}),
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(!title.trim() ? titleId : `${titleId}-area`)?.focus()
      return
    }
    setBusy(true)
    try {
      let photo_url = null
      if (photo?.file) {
        try { photo_url = await uploadPhoto(photo.file) }
        catch { toast('No se pudo subir la foto, se envía sin ella', 'error') }
      }
      const payload = {
        title: title.trim(),
        area,
        zone,
        category: category || 'otro',
        photo_url,
        priority: urgent ? 'urgent' : 'normal',
        status: 'pending',
        reported_by: employee.id,
        reported_by_name: employee.name,
      }
      if (isMant) await createMaintenance(payload)
      else await createIncidencia(payload)
      toast(isMant ? 'Aviso enviado a mantenimiento ✓' : 'Incidencia registrada ✓')
      reset()
      onClose()
      onCreated?.()
    } catch {
      toast('No se pudo reportar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={requestClose} title={confirmingClose ? '¿Descartar incidencia?' : sheetTitle}>
      {confirmingClose ? (
        <div>
          <p className="mb-5 text-base leading-relaxed text-ink/65">
            Hay información sin enviar. Puedes seguir editando o descartarla.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClose(false)}
              className="min-h-[50px] flex-1 rounded-2xl bg-ink/5 px-4 font-bold text-ink/70"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={closeNow}
              className="min-h-[50px] flex-1 rounded-2xl bg-terracotta px-4 font-extrabold text-white"
            >
              Descartar
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={submit} noValidate>
        <p className="mb-4 text-sm text-ink/55">{sheetDesc}</p>

        <label htmlFor={titleId} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
          ¿Qué pasa? <span className="text-terracotta">*</span>
        </label>
        <input
          id={titleId}
          autoFocus
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (errors.title && e.target.value.trim()) setErrors((cur) => ({ ...cur, title: null }))
          }}
          onBlur={() => {
            if (!title.trim()) setErrors((cur) => ({ ...cur, title: 'Describe brevemente qué está pasando.' }))
          }}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? titleErrorId : undefined}
          placeholder={placeholder}
          className={`field ${errors.title ? 'border-terracotta focus:border-terracotta' : ''}`}
        />
        <div className="mb-4 min-h-[20px]">
          {errors.title && <p id={titleErrorId} role="alert" className="mt-1 text-sm font-semibold text-terracotta">{errors.title}</p>}
        </div>

        <p className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">Tipo</p>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de incidencia">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.key}
            onClick={() => setCategory(c.key)}
            aria-pressed={category === c.key}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              category === c.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'
            }`}
          >
            {c.label}
          </button>
        ))}
        </div>

        <p className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
          Área / local <span className="text-terracotta">*</span>
        </p>
        <div
          id={`${titleId}-area`}
          tabIndex={-1}
          className={`flex flex-wrap gap-2 rounded-2xl ${errors.area ? 'ring-2 ring-terracotta/35' : ''}`}
          role="group"
          aria-label="Área o local"
          aria-invalid={Boolean(errors.area)}
        >
        {(areas.data || []).map((a) => (
          <button
            type="button"
            key={a.id}
            onClick={() => {
              const next = a.name === area ? null : a.name
              setArea(next)
              if (next) setErrors((cur) => ({ ...cur, area: null }))
            }}
            aria-pressed={area === a.name}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              area === a.name ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'
            }`}
          >
            {a.name}
          </button>
        ))}
        </div>
        <div className="mb-4 min-h-[20px]">
          {errors.area && <p role="alert" className="mt-1 text-sm font-semibold text-terracotta">{errors.area}</p>}
        </div>

        <p className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">Zona</p>
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Zona">
        {ZONES.map((z) => (
          <button
            type="button"
            key={z}
            onClick={() => setZone(z === zone ? null : z)}
            aria-pressed={zone === z}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              zone === z ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/70'
            }`}
          >
            {z}
          </button>
        ))}
        </div>

        <p className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">Foto (opcional)</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
      {photo ? (
        <div className="relative mb-5">
          <img src={photo.preview} alt="adjunto" className="h-44 w-full rounded-2xl object-cover" />
          <button
            type="button"
            onClick={() => { URL.revokeObjectURL(photo.preview); setPhoto(null) }}
            aria-label="Quitar foto"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 text-white"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mb-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 px-4 font-semibold text-ink/55 active:scale-[0.98]"
        >
          <Camera size={20} /> Hacer / adjuntar foto
        </button>
      )}

      <button
        type="button"
        onClick={() => setUrgent((v) => !v)}
        role="switch"
        aria-checked={urgent}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition ${
          urgent ? 'border-terracotta bg-terracotta/8' : 'border-ink/10 bg-white'
        }`}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Alert size={18} className={urgent ? 'text-terracotta' : 'text-ink/40'} />
          Marcar como urgente
        </span>
        <span className={`relative h-6 w-11 rounded-full transition ${urgent ? 'bg-terracotta' : 'bg-ink/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${urgent ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary"
      >
        {busy ? 'Enviando…' : 'Enviar incidencia'}
      </button>
      </form>
      )}
    </Sheet>
  )
}
