import { useState } from 'react'
import Sheet from './Sheet'
import { createAdHoc } from '../lib/api'
import { useToast } from './Toast'
import { Alert, Spray } from './icons'

const ZONES = ['Aseos hombres', 'Aseos mujeres', 'Vestuario hombres', 'Vestuario mujeres', 'Recepción', 'Sala principal', 'Sala spinning', 'Sala funcional', 'Zona de pesas']

// Permite a un coach (o admin) mandar una tarea de limpieza puntual al equipo de limpieza.
export default function CleaningRequest({ open, onClose, employee, onCreated }) {
  const [title, setTitle] = useState('')
  const [zone, setZone] = useState(null)
  const [urgent, setUrgent] = useState(true)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit() {
    if (!title.trim()) { toast('Describe qué limpiar', 'error'); return }
    setBusy(true)
    try {
      await createAdHoc({
        target_role: 'cleaning',
        title: title.trim(),
        zone,
        priority: urgent ? 'urgent' : 'normal',
        status: 'pending',
        created_by: employee.id,
        created_by_name: employee.name,
      })
      toast('Aviso enviado a limpieza ✓')
      setTitle(''); setZone(null); setUrgent(true)
      onClose()
      onCreated?.()
    } catch {
      toast('No se pudo enviar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Avisar a limpieza">
      <p className="mb-4 text-sm text-ink/55">Manda una tarea puntual al equipo de limpieza. Si es urgente, les saldrá arriba del todo en rojo.</p>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">¿Qué hay que limpiar?</label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ej: Derrame de agua en sala spinning"
        className="mb-4 field"
      />

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Zona</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {ZONES.map((z) => (
          <button
            key={z}
            onClick={() => setZone(z === zone ? null : z)}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              zone === z ? 'bg-bronze text-white' : 'bg-ink/5 text-ink/70'
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      <button
        onClick={() => setUrgent((v) => !v)}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition ${
          urgent ? 'border-terracotta bg-terracotta/8' : 'border-ink/10 bg-white'
        }`}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Alert size={18} className={urgent ? 'text-terracotta' : 'text-ink/40'} />
          Urgente (prioritario sobre su ruta)
        </span>
        <span className={`relative h-6 w-11 rounded-full transition ${urgent ? 'bg-terracotta' : 'bg-ink/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${urgent ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>

      <button
        onClick={submit}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 btn-primary"
      >
        <Spray size={22} /> Enviar a limpieza
      </button>
    </Sheet>
  )
}
