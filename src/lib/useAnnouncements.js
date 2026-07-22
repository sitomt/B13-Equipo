import { useCallback, useRef } from 'react'
import { useData } from './useData'
import {
  recentAnnouncements, listAllAnnouncements, listAnnouncementReads, listEmployees,
  markAnnouncementRead, listAnnouncementComments, createAnnouncementComment,
  getCommentSeen, setCommentSeen,
} from './api'
import { todayMadrid } from './date'

// ============================================================================
// Estado compartido de la pestaña "Avisos" de un rol: avisos vigentes +
// anteriores (≤30 días), quién ha leído cada uno (transparencia total: todos
// ven todo), la conversación bajo cada aviso y el contador de no-leídos
// (avisos sin leer + comentarios nuevos) para el badge del navbar.
// El admin comparte el hook con role === 'admin' (todos los avisos).
// ============================================================================
export function useAnnouncements(role, employee) {
  const ann = useData(
    () => (role === 'admin' ? listAllAnnouncements() : recentAnnouncements(role)),
    [role],
    { interval: 60000 },
  )
  const reads = useData(listAnnouncementReads, [], { interval: 30000 })
  const emps = useData(listEmployees, [])

  // Comentarios de los avisos cargados. La clave son los ids ORDENADOS: así el
  // reorden de la query base no re-dispara la carga si el conjunto no cambia.
  const annIds = (ann.data || []).map((a) => a.id).sort()
  const annKey = annIds.join(',')
  const comments = useData(() => listAnnouncementComments(annIds), [annKey], { interval: 30000 })

  // Última vez que este empleado vio la conversación (para el contador).
  const seen = useData(
    () => (employee ? getCommentSeen(employee.id) : null),
    [employee?.id],
  )

  // Avisos ya marcados (o en vuelo) en esta sesión: evita re-disparar el
  // marcado en bucle cuando el reload de lecturas re-ejecuta el efecto.
  const markedRef = useRef(new Set())
  // "Visto" de comentarios ya estampado en esta sesión de pantalla.
  const seenMarkedRef = useRef(false)

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

  // Comentarios agrupados por aviso (ya llegan en orden cronológico).
  const commentsByAnn = new Map()
  for (const c of comments.data || []) {
    if (!commentsByAnn.has(c.announcement_id)) commentsByAnn.set(c.announcement_id, [])
    commentsByAnn.get(c.announcement_id).push(c)
  }

  // Empleados por id (avatares con foto en la conversación).
  const empById = new Map((emps.data || []).map((e) => [e.id, e]))

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

  const commentsFor = (a) => commentsByAnn.get(a.id) || []

  // Comentarios nuevos de otros en avisos ACTIVOS desde el último "visto".
  const seenAt = seen.data ? new Date(seen.data).getTime() : 0
  const activeIds = new Set(activos.map((a) => a.id))
  const commentUnread = !employee
    ? 0
    : (comments.data || []).filter(
        (c) =>
          activeIds.has(c.announcement_id) &&
          c.employee_id !== employee.id &&
          new Date(c.created_at).getTime() > seenAt,
      ).length

  // Avisos vigentes que este empleado aún no ha leído (para el admin ese
  // término es 0) + comentarios nuevos → badge del navbar.
  const annUnread = !employee || employee.role === 'admin'
    ? 0
    : activos.filter((a) => !(readsByAnn.get(a.id) || new Set()).has(employee.id)).length
  const unreadCount = annUnread + commentUnread

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

  // Estampa "conversación vista ahora" (al abrir la pestaña). El ref evita
  // repetir el upsert en cada re-render de la misma sesión de pantalla.
  const markCommentsSeen = useCallback(async () => {
    if (!employee || seenMarkedRef.current) return
    seenMarkedRef.current = true
    try {
      await setCommentSeen(employee.id)
      await seen.reload(true)
    } catch {
      seenMarkedRef.current = false // sin cobertura: se podrá reintentar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id])

  // Publica un comentario y refresca la conversación (el pintado optimista
  // vive en CommentThread; aquí solo la verdad del servidor).
  const addComment = useCallback(async (a, body) => {
    await createAnnouncementComment(a.id, employee, body)
    await comments.reload(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id])

  return {
    activos, anteriores, unreadCount, statFor, markActiveRead, loading,
    commentsFor, addComment, markCommentsSeen, empById,
  }
}
