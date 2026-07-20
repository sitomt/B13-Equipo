import { useEffect } from 'react'
import AnnouncementDetailCard from '../components/AnnouncementDetailCard'
import { CollapsibleSection, CountBadge, SkeletonList, EmptyState } from '../components/ui'
import { Megaphone, Clock } from '../components/icons'

// ============================================================================
// Pestaña "Avisos" (coach, limpieza y mantenimiento): vigentes arriba y un
// desplegable "Anteriores" con los caducados/archivados de ≤30 días.
// `store` es el resultado de useAnnouncements (vive en la View para que el
// badge del navbar comparta datos con esta pantalla).
// ============================================================================
export default function AnnouncementsScreen({ store, employee }) {
  const { activos, anteriores, statFor, markActiveRead, loading } = store

  // Al abrir la pestaña se marcan como leídos los vigentes pendientes:
  // el badge del navbar desaparece en vivo.
  useEffect(() => {
    if (!loading) markActiveRead()
  }, [loading, markActiveRead])

  if (loading) return <SkeletonList rows={3} />

  return (
    <div className="space-y-5 pb-24">
      {activos.length === 0 ? (
        <EmptyState icon={Megaphone} title="Sin avisos activos" subtitle="Cuando haya un aviso para tu equipo aparecerá aquí." />
      ) : (
        <div className="space-y-3">
          {activos.map((a, i) => (
            <div key={a.id} className="animate-rise-in" style={{ animationDelay: `${i * 35}ms` }}>
              <AnnouncementDetailCard a={a} stat={statFor(a)} />
            </div>
          ))}
        </div>
      )}

      {anteriores.length > 0 && (
        <CollapsibleSection
          icon={Clock}
          title="Anteriores"
          right={<CountBadge tone="ink">{anteriores.length}</CountBadge>}
          defaultOpen={false}
          persistKey={`b13.anns.past.${employee.id}`}
        >
          <div className="space-y-3">
            {anteriores.map((a) => (
              <AnnouncementDetailCard key={a.id} a={a} stat={statFor(a)} past />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
