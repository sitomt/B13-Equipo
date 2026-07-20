import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Button } from '../../components/controls'
import { listTimeBands, createTimeBand, updateTimeBand, deleteTimeBand } from '../../lib/api'
import { haptic } from '../../lib/haptics'
import { Check, Trash, Plus, ChevronDown } from '../../components/icons'

const inp = 'rounded-xl border border-ink/10 bg-white px-2 py-2.5 text-base font-semibold tabular outline-none focus:border-bronze'

function BandRow({ band, onChanged, toast, canMoveUp, canMoveDown, onMove }) {
  const [label, setLabel] = useState(band.label || '')
  const [start, setStart] = useState(band.start_time.slice(0, 5))
  const [end, setEnd] = useState(band.end_time.slice(0, 5))
  const [busy, setBusy] = useState(false)
  const dirty = label !== (band.label || '') || start !== band.start_time.slice(0, 5) || end !== band.end_time.slice(0, 5)

  async function save() {
    if (end <= start) { toast('El fin debe ser posterior', 'error'); return }
    setBusy(true)
    try { await updateTimeBand(band.id, { label: label.trim() || null, start_time: start, end_time: end }); haptic('success'); toast('Franja guardada ✓'); await onChanged() }
    catch { toast('No se pudo guardar', 'error') } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await deleteTimeBand(band.id); haptic('warning'); toast('Franja eliminada'); await onChanged() }
    catch { toast('No se pudo eliminar', 'error') } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-ink/10 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nombre (Mañana…)" className={`${inp} min-w-0 flex-1 !tabular-nums`} />
        <div className="flex shrink-0 flex-col gap-0.5">
          <button onClick={() => onMove(-1)} disabled={!canMoveUp || busy} aria-label="Subir" className="flex h-5 w-9 items-center justify-center rounded-md bg-ink/5 text-ink/50 active:scale-90 disabled:opacity-25">
            <ChevronDown size={14} className="rotate-180" />
          </button>
          <button onClick={() => onMove(1)} disabled={!canMoveDown || busy} aria-label="Bajar" className="flex h-5 w-9 items-center justify-center rounded-md bg-ink/5 text-ink/50 active:scale-90 disabled:opacity-25">
            <ChevronDown size={14} />
          </button>
        </div>
        <button onClick={remove} disabled={busy} aria-label="Eliminar franja" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-terracotta active:scale-90 disabled:opacity-50">
          <Trash size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inp} flex-1`} />
        <span className="text-ink/30">→</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inp} flex-1`} />
      </div>
      {dirty && (
        <button onClick={save} disabled={busy} className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-sage text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          <Check size={16} /> Guardar cambios
        </button>
      )}
    </div>
  )
}

// Franjas horarias del gimnasio: las filas del cuadrante. Cambian por temporada;
// editarlas NO altera las semanas ya asignadas (los turnos guardan sus horas).
export default function TimeBandsEditor({ open, bands, onClose, onChanged, toast }) {
  const [adding, setAdding] = useState(false)
  const [nLabel, setNLabel] = useState('')
  const [nStart, setNStart] = useState('09:00')
  const [nEnd, setNEnd] = useState('14:00')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (nEnd <= nStart) { toast('El fin debe ser posterior', 'error'); return }
    setBusy(true)
    try {
      await createTimeBand({ label: nLabel.trim() || null, start_time: nStart, end_time: nEnd, position: bands.length })
      haptic('success'); toast('Franja añadida ✓')
      setAdding(false); setNLabel(''); setNStart('09:00'); setNEnd('14:00')
      await onChanged()
    } catch { toast('No se pudo añadir', 'error') } finally { setBusy(false) }
  }

  async function move(idx, dir) {
    const j = idx + dir
    if (j < 0 || j >= bands.length) return
    try {
      await Promise.all([
        updateTimeBand(bands[idx].id, { position: j }),
        updateTimeBand(bands[j].id, { position: idx }),
      ])
      haptic('tap')
      await onChanged()
    } catch { toast('No se pudo reordenar', 'error') }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Franjas del gym">
      <p className="-mt-1 mb-4 text-sm leading-relaxed text-ink/55">
        Son las filas del cuadrante. Cámbialas cuando cambien los horarios del gym:
        las semanas ya asignadas conservan sus horas.
      </p>
      <div className="space-y-3 pb-2">
        {bands.map((b, i) => (
          <BandRow
            key={b.id} band={b} onChanged={onChanged} toast={toast}
            canMoveUp={i > 0} canMoveDown={i < bands.length - 1} onMove={(dir) => move(i, dir)}
          />
        ))}

        {adding ? (
          <div className="rounded-2xl border-2 border-dashed border-bronze/40 p-3">
            <input value={nLabel} onChange={(e) => setNLabel(e.target.value)} placeholder="Nombre (opcional)" className={`${inp} mb-2 w-full`} autoFocus />
            <div className="mb-3 flex items-center gap-2">
              <input type="time" value={nStart} onChange={(e) => setNStart(e.target.value)} className={`${inp} flex-1`} />
              <span className="text-ink/30">→</span>
              <input type="time" value={nEnd} onChange={(e) => setNEnd(e.target.value)} className={`${inp} flex-1`} />
            </div>
            <Button variant="primary" size="sm" full icon={Plus} loading={busy} onClick={add}>Añadir franja</Button>
          </div>
        ) : (
          <Button variant="secondary" full icon={Plus} onClick={() => setAdding(true)}>Nueva franja</Button>
        )}
      </div>
    </Sheet>
  )
}
