import { useCallback, useRef } from 'react'
import { useData } from './useData'
import { recentAnnouncements, listAnnouncementReads, listEmployees, markAnnouncementRead } from './api'
import { todayMadrid } from './date'

// ============================================================================
// Estado compartido de la pestaña "Avisos" de un rol: avisos vigentes +
// anteriores (≤30 días), quién ha leído cada uno (transparencia total: todos
// ven todo) y el contador de no-leídos para el badge del navbar.
// ============================================================================
export function useAnnouncements(role, employee) {
  const ann = useData(() => recentAnnouncements(role), [role], { interval: 60000 })
  const reads = useData(listAnnouncementReads, [], { interval: 30000 })
  const emps = useData(listEmployees, [])

  // Avisos ya marcados (o en vuelo) en esta sesión: evita re-disparar el
  // marcado en bucle cuando el reload de lecturas re-ejecuta el efecto.
  const markedRef = useRef(new Set())

  const today = todayMadrid()
  const activos = (ann.data || []).filter((a) => a.active && a.ends_on >= today)
  const anteriores = (ann.data || [])
    .filter((a) => !(a.active && a.ends_on >= today))
    .sort((a, b) => (a.ends_on < b.ends_on ? 1 : -1))

  // Lecturas por aviso. El mismo cálculo vive en AdminAnnouncements.jsx (vista
  // admin, que no se toca): Map announcement_id → Set(employee_id).
  const readsByAnn = new Map()
  for (const r of reads.data || []) {
    if (!readsByAnn.has(r.announcement_id)) readsByAnn.set(r.announcement_id, new Set())
    readsByAnn.get(r.announcement_id).add(r.employee_id)
  }

  // Para un aviso: su audiencia (empleados no-admin de los roles destino) y
  // quién de ella lo ha leído / le falta.
  function statFor(a) {
    const audience = (emps.data || []).filter((e) => e.role !== 'admin' && a.target_roles?.includes(e.role))
    const readSet = readsByAnn.get(a.id) || new Set()
    return {
      read: audience.filter((e) => readSet.has(e.id)),
      pending: audience.filter((e) => !readSet.has(e.id)),
      total: audience.length,
    }
  }

  // Avisos vigentes que este empleado aún no ha leído (badge del navbar).
  const unreadCount = !employee || employee.role === 'admin'
    ? 0
    : activos.filter((a) => !(readsByAnn.get(a.id) || new Set()).has(employee.id)).length

  const loading = ann.loading || reads.loading

  // Marca como leídos todos los vigentes pendientes (al abrir la pestaña).
  const markActiveRead = useCallback(async () => {
    if (!employee || employee.role === 'admin') return
    const pending = activos.filter(
      (a) => !(readsByAnn.get(a.id) || new Set()).has(employee.id) && !markedRef.current.has(a.id),
    )
    if (pending.length === 0) return
    pending.forEach((a) => markedRef.current.add(a.id))
    try {
      await Promise.all(pending.map((a) => markAnnouncementRead(a.id, employee.id)))
      await reads.reload(true)
    } catch {
      // Falló el marcado (p.ej. sin cobertura): se libera para reintentar.
      pending.forEach((a) => markedRef.current.delete(a.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ann.data, reads.data, employee?.id])

  return { activos, anteriores, unreadCount, statFor, markActiveRead, loading }
}
