import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/ui'
import { Plus } from '../../components/icons'
import { dowLabel, parseDate, isTodayStr } from '../../lib/date'

export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
// "7" / "7:30" (sin ceros a la izquierda, sin :00)
export const hLabel = (t) => { const [h, m] = t.split(':').map(Number); return m === 0 ? `${h}` : `${h}:${String(m).padStart(2, '0')}` }
export const bandRange = (b) => `${hLabel(b.start_time.slice(0, 5))}–${hLabel(b.end_time.slice(0, 5))}`

// Asigna cada turno a su franja: por band_id si existe; si no (turnos antiguos),
// por máximo solape horario. Sin solape → fila "Fuera de franja" (nunca se pierde nada).
export function groupShiftsByBand(shifts, bands) {
  const byBand = new Map(bands.map((b) => [b.id, new Map()]))
  const extra = new Map()
  const push = (map, date, s) => {
    if (!map.has(date)) map.set(date, [])
    map.get(date).push(s)
  }
  for (const s of shifts) {
    if (s.band_id && byBand.has(s.band_id)) { push(byBand.get(s.band_id), s.work_date, s); continue }
    let best = null, bestOverlap = 0
    const s0 = toMin(s.start_time), s1 = toMin(s.end_time)
    for (const b of bands) {
      const o = Math.min(s1, toMin(b.end_time)) - Math.max(s0, toMin(b.start_time))
      if (o > bestOverlap) { bestOverlap = o; best = b }
    }
    if (best) push(byBand.get(best.id), s.work_date, s)
    else push(extra, s.work_date, s)
  }
  return { byBand, extra }
}

// ============================================================================
// Cuadrante de horarios: días de la semana ARRIBA (columnas), franjas horarias
// del gym A LA IZQUIERDA (filas), nombres en las celdas. Carrusel horizontal
// con ~2,5 días visibles y el siguiente asomando (affordance de swipe).
// ============================================================================
export default function TimeBandGrid({ bands, days, byBand, extra, empById, employee, editable = false, onCellTap }) {
  const scroller = useRef(null)
  // Affordance de swipe: fade en el filo derecho mientras quede contenido oculto.
  const [atEnd, setAtEnd] = useState(false)

  function updateAtEnd(el) {
    if (!el) return
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8)
  }

  // Al montar, colocar el día de hoy como primera columna visible.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const idx = days.findIndex((d) => isTodayStr(d))
    if (idx > 0) el.scrollLeft = idx * 120
    updateAtEnd(el)
  }, [days.join?.('') || days])

  const hasExtra = extra && [...extra.values()].some((arr) => arr.length)
  const rows = [...bands, ...(hasExtra ? [{ id: '__extra', label: 'Fuera de franja', extra: true }] : [])]

  function cellContent(assignments, band) {
    if (!assignments.length) {
      return editable && !band.extra
        ? <Plus size={16} className="text-ink/20" />
        : <span className="text-ink/15">·</span>
    }
    return assignments.map((s) => {
      const e = empById.get(s.employee_id)
      if (!e) return null
      const isMe = e.id === employee?.id
      // Horas distintas de las de la franja (o fila extra): se muestran
      const custom = band.extra || (band.start_time && (s.start_time.slice(0, 5) !== band.start_time.slice(0, 5) || s.end_time.slice(0, 5) !== band.end_time.slice(0, 5)))
      return (
        <span
          key={s.id}
          className={`flex w-full items-center gap-1 truncate rounded-lg px-1.5 py-0.5 text-[11px] font-bold leading-tight ${isMe ? 'ring-1 ring-inset' : ''}`}
          style={{ background: e.color + '22', color: e.color, ...(isMe ? { boxShadow: `inset 0 0 0 1px ${e.color}66` } : {}) }}
        >
          <Avatar emp={e} size={16} />
          <span className="min-w-0 flex-1 truncate">{e.name.split(' ')[0]}</span>
          {custom && <span className="tabular shrink-0 text-[9px] font-semibold opacity-80">{hLabel(s.start_time.slice(0, 5))}–{hLabel(s.end_time.slice(0, 5))}</span>}
        </span>
      )
    })
  }

  // Cada fila es su propio grid a ancho completo: así la celda de la franja
  // (sticky left) tiene sitio donde "pegarse" al hacer scroll horizontal.
  const rowCols = { gridTemplateColumns: `76px repeat(${days.length}, 120px)` }

  return (
    /* Full-bleed: -mx-4 compensa el px-4 del wrapper de cada vista para que el
       cuadrante llegue al borde de la pantalla; el corte al filo + fade comunican
       que se puede deslizar para ver más días. */
    <div className="relative -mx-4">
      <div className="overflow-hidden border-y border-ink/[0.06] bg-white shadow-card">
      {/* scroll-padding = ancho de la columna sticky: el día "snapeado" aparece justo tras ella */}
      <div
        ref={scroller}
        onScroll={(e) => updateAtEnd(e.currentTarget)}
        className="no-scrollbar snap-x snap-proximity overflow-x-auto"
        style={{ scrollPaddingLeft: '76px' }}
      >
        <div className="w-max min-w-full">
          {/* Fila de días */}
          <div className="grid" style={rowCols}>
            <div className="sticky left-0 z-20 border-b border-ink/[0.06] bg-sand-50" />
            {days.map((d) => {
              const today = isTodayStr(d)
              return (
                <div key={d} className={`flex snap-start flex-col items-center border-b border-l border-ink/[0.05] py-2 ${today ? 'bg-bronze/[0.07] text-bronze-dark' : 'bg-sand-50 text-ink/50'}`}>
                  <span className="text-[10px] font-bold uppercase">{dowLabel(d)}</span>
                  <span className="tabular font-display text-base font-extrabold leading-none">{parseDate(d).getDate()}</span>
                </div>
              )
            })}
          </div>

          {/* Filas de franjas */}
          {rows.map((band) => (
            <div key={band.id} className="grid" style={rowCols}>
              <div className="sticky left-0 z-20 flex flex-col justify-center border-b border-r border-ink/[0.05] bg-white px-2 py-2">
                {band.extra ? (
                  <span className="text-[10px] font-bold uppercase leading-tight text-ink/40">{band.label}</span>
                ) : (
                  <>
                    <span className="tabular font-display text-sm font-extrabold leading-tight text-ink">{bandRange(band)}</span>
                    {band.label && <span className="truncate text-[10px] font-semibold text-ink/40">{band.label}</span>}
                  </>
                )}
              </div>
              {days.map((d) => {
                const source = band.extra ? extra : byBand.get(band.id)
                const assignments = source?.get(d) || []
                const today = isTodayStr(d)
                const interactive = editable
                const Cell = interactive ? 'button' : 'div'
                return (
                  <Cell
                    key={`${band.id}-${d}`}
                    {...(interactive ? { onClick: () => onCellTap(band, d, assignments) } : {})}
                    className={`flex min-h-[52px] flex-col justify-center gap-1 border-b border-l border-ink/[0.05] px-1 py-1.5 text-left ${
                      today ? 'bg-bronze/[0.04]' : ''
                    } ${interactive ? 'active:bg-ink/[0.04]' : ''} ${!assignments.length ? 'items-center' : 'items-stretch'}`}
                  >
                    {cellContent(assignments, band)}
                  </Cell>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* Fade del filo derecho: desaparece al llegar al final del scroll */}
      {!atEnd && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-sand to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
