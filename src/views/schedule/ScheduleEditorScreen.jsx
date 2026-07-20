import { useMemo, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { Button, WeekStepper } from '../../components/controls'
import { Tag, SkeletonList, ConfirmSheet } from '../../components/ui'
import TimeBandGrid, { groupShiftsByBand } from './TimeBandGrid'
import AssignSheet from './AssignSheet'
import TimeBandsEditor from './TimeBandsEditor'
import {
  listEmployees, listShifts, listTimeBands,
  getScheduleWeek, publishWeek, unpublishWeek,
} from '../../lib/api'
import { useData } from '../../lib/useData'
import { useSession } from '../../state/session'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { weekBounds } from '../../lib/date'
import { Clock, Check } from '../../components/icons'

// ============================================================================
// Pantalla dedicada de EDICIÓN de horarios (desde "+ → Editar horarios", admin).
// Flujo de 3 toques: celda del cuadrante → empleado → asignado.
// "Publicar horario" es el CTA protagonista, fijo abajo.
// ============================================================================
export default function ScheduleEditorScreen({ onClose }) {
  const { employee } = useSession()
  const toast = useToast()
  const [offset, setOffset] = useState(0)
  const week = useMemo(() => weekBounds(offset), [offset])
  const [assigning, setAssigning] = useState(null) // { band, date, assignments }
  const [bandsOpen, setBandsOpen] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [busy, setBusy] = useState(false)

  const emp = useData(listEmployees, [])
  const bands = useData(listTimeBands, [])
  const shifts = useData(() => listShifts(week.startStr, week.endStr), [week.startStr])
  const schedWeek = useData(() => getScheduleWeek(week.startStr), [week.startStr], { interval: 0 })

  const staff = (emp.data || []).filter((e) => e.role !== 'admin')
  const empById = useMemo(() => new Map((emp.data || []).map((e) => [e.id, e])), [emp.data])
  const { byBand, extra } = useMemo(
    () => groupShiftsByBand(shifts.data || [], bands.data || []),
    [shifts.data, bands.data]
  )

  const published = schedWeek.data?.status === 'published'
  const loading = emp.loading || shifts.loading || bands.loading

  async function reloadShifts() {
    await shifts.reload(true)
    // refresca el estado del sheet de asignación con los turnos nuevos
    setAssigning((a) => a && { ...a }) // AssignSheet lee assignments de state; recalculamos abajo
  }

  // assignments del sheet siempre frescos (recalculados de los datos actuales)
  const assigningLive = useMemo(() => {
    if (!assigning) return null
    const source = assigning.band.extra ? extra : byBand.get(assigning.band.id)
    return { ...assigning, assignments: source?.get(assigning.date) || [] }
  }, [assigning, byBand, extra])

  async function publish() {
    setBusy(true)
    try {
      await publishWeek(week.startStr, employee.id)
      haptic('success'); toast('Semana publicada ✓ · el equipo ya la ve')
      await schedWeek.reload(true)
    } catch { toast('No se pudo publicar', 'error') } finally { setBusy(false) }
  }
  async function unpublish() {
    setBusy(true)
    try {
      await unpublishWeek(week.startStr)
      haptic('warning'); toast('Semana retirada · vuelve a borrador')
      await schedWeek.reload(true)
    } catch { toast('No se pudo retirar', 'error') } finally { setBusy(false) }
  }

  return (
    <OverlayScreen
      title="Editar horarios"
      onClose={onClose}
      footer={
        published ? (
          <Button variant="secondary" full icon={Check} loading={busy} onClick={() => setConfirmUnpublish(true)}>
            Publicado ✓ · Retirar publicación
          </Button>
        ) : (
          <Button variant="primary" full loading={busy} onClick={publish}>
            Publicar horario
          </Button>
        )
      }
    >
      <div className="space-y-4 pb-4">
        <WeekStepper
          label={week.label}
          onPrev={() => setOffset((o) => o - 1)}
          onNext={() => setOffset((o) => o + 1)}
        >
          <div className="mt-0.5">
            <Tag status={published ? 'published' : 'draft'} />
          </div>
        </WeekStepper>

        {loading ? (
          <SkeletonList rows={5} />
        ) : (
          <>
            <TimeBandGrid
              bands={bands.data || []}
              days={week.days}
              byBand={byBand}
              extra={extra}
              empById={empById}
              employee={employee}
              editable
              onCellTap={(band, date, assignments) => setAssigning({ band, date, assignments })}
            />
            <p className="px-1 text-xs leading-relaxed text-ink/45">
              Toca una casilla y elige quién trabaja esa franja. Desliza a los lados para ver más días.
            </p>
            <Button variant="secondary" size="sm" full icon={Clock} onClick={() => setBandsOpen(true)}>
              Editar franjas del gym
            </Button>
          </>
        )}
      </div>

      {assigningLive && (
        <AssignSheet
          state={assigningLive}
          staff={staff}
          onClose={() => setAssigning(null)}
          onChanged={reloadShifts}
          createdBy={employee.id}
          toast={toast}
        />
      )}

      <TimeBandsEditor
        open={bandsOpen}
        bands={bands.data || []}
        onClose={() => setBandsOpen(false)}
        onChanged={() => Promise.all([bands.reload(true), shifts.reload(true)])}
        toast={toast}
      />

      <ConfirmSheet
        open={confirmUnpublish}
        onClose={() => setConfirmUnpublish(false)}
        onConfirm={unpublish}
        title="Retirar publicación"
        message="El equipo dejará de ver el horario de esta semana hasta que lo vuelvas a publicar."
        confirmLabel="Retirar"
        tone="danger"
      />
    </OverlayScreen>
  )
}
