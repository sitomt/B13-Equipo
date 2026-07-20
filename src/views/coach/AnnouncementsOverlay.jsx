import OverlayScreen from '../../components/OverlayScreen'
import { AnnouncementCard } from '../../components/cards'
import { EmptyState } from '../../components/ui'
import { Megaphone } from '../../components/icons'

// Avisos activos a pantalla completa (urgentes primero). El acuse de lectura
// lo hace AnnouncementCard automáticamente al mostrarse.
export default function AnnouncementsOverlay({ anns = [], onClose }) {
  const sorted = [...anns].sort((a, b) => (b.priority === 'high') - (a.priority === 'high'))
  return (
    <OverlayScreen title="Avisos" onClose={onClose}>
      {sorted.length === 0 ? (
        <EmptyState icon={Megaphone} title="Sin avisos activos" />
      ) : (
        <div className="space-y-3 pb-6">
          {sorted.map((a, i) => (
            <div key={a.id} className="animate-rise-in" style={{ animationDelay: `${i * 35}ms` }}>
              <AnnouncementCard a={a} />
            </div>
          ))}
        </div>
      )}
    </OverlayScreen>
  )
}
