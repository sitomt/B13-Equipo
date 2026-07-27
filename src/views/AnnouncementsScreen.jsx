import { useEffect, useRef, useState } from 'react'
import AnnouncementDetailCard from '../components/AnnouncementDetailCard'
import { CountBadge, SkeletonList, EmptyState } from '../components/ui'
import SectionCard from '../components/SectionCard'
import { Megaphone, Clock } from '../components/icons'

// ============================================================================
// Pestaña "Avisos" (coach, limpieza y mantenimiento): vigentes arriba y un
// desplegable "Anteriores" con los caducados/archivados de ≤30 días.
// `store` es el resultado de useAnnouncements (vive en la View para que el
// badge del navbar comparta datos con esta pantalla).
// ============================================================================
export default function AnnouncementsScreen({ store, employee }) {
  const {
    activos, anteriores, unreadAnnouncements, statFor, markOneRead, loading,
    commentsFor, addComment, markCommentsSeen, empById,
  } = store
  const initialUnreadRef = useRef(null)
  const [openedIds, setOpenedIds] = useState(() => new Set())

  if (!loading && initialUnreadRef.current === null) {
    initialUnreadRef.current = new Set(unreadAnnouncements.map((a) => a.id))
  }

  // La conversación sí queda vista al entrar. Cada aviso se marca de forma
  // individual desde su tarjeta, cuando la persona abre el detalle.
  useEffect(() => {
    if (!loading) markCommentsSeen()
  }, [loading, markCommentsSeen])

  if (loading) return <SkeletonList rows={3} />

  const newIds = initialUnreadRef.current || new Set()
  const nuevos = activos.filter((a) => newIds.has(a.id) && !openedIds.has(a.id))
  const leidos = activos.filter((a) => !newIds.has(a.id) || openedIds.has(a.id))

  function handleOpen(a) {
    if (!newIds.has(a.id) || openedIds.has(a.id)) return
    setOpenedIds((current) => new Set(current).add(a.id))
    markOneRead(a).catch(() => {})
  }

  return (
    <div className="space-y-5 pb-24">
      {activos.length === 0 ? (
        <EmptyState icon={Megaphone} title="Sin avisos activos" subtitle="Cuando haya un aviso para tu equipo aparecerá aquí." />
      ) : (
        <>
          {nuevos.length > 0 && (
            <section aria-labelledby="new-announcements-title">
              <p id="new-announcements-title" className="mb-2 px-1 text-xs font-bold uppercase text-terracotta">
                Nuevos para ti · {nuevos.length}
              </p>
              <div className="space-y-3">
                {nuevos.map((a, i) => (
                  <div key={a.id} className="animate-rise-in" style={{ animationDelay: `${i * 35}ms` }}>
                    <AnnouncementDetailCard
                      a={a} stat={statFor(a)} isNew onOpen={() => handleOpen(a)}
                      comments={commentsFor(a)} employee={employee} empById={empById} onSend={addComment}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          {leidos.length > 0 && (
            <section aria-labelledby="active-announcements-title">
              <p id="active-announcements-title" className="mb-2 px-1 text-xs font-bold uppercase text-ink/45">
                Activos leídos · {leidos.length}
              </p>
              <div className="space-y-3">
                {leidos.map((a) => (
                  <AnnouncementDetailCard
                    key={a.id} a={a} stat={statFor(a)}
                    onOpen={() => handleOpen(a)}
                    comments={commentsFor(a)} employee={employee} empById={empById} onSend={addComment}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {anteriores.length > 0 && (
        <SectionCard
          icon={Clock}
          title="Anteriores"
          right={<CountBadge tone="ink">{anteriores.length}</CountBadge>}
          defaultOpen={false}
          persistKey={`b13.anns.past.${employee.id}`}
        >
          {/* Los avisos conservan su identidad de card sobre fondo sand */}
          <div className="space-y-3 bg-sand-50 p-3">
            {anteriores.map((a) => (
              <AnnouncementDetailCard
                key={a.id} a={a} stat={statFor(a)} past
                comments={commentsFor(a)} employee={employee} empById={empById}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
