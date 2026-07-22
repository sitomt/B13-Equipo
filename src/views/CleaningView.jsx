import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import { SegmentedControl } from '../components/controls'
import AnnouncementSheet from '../components/AnnouncementSheet'
import ReportIncident from '../components/ReportIncident'
import CleaningToday from './cleaning/CleaningToday'
import CleaningStats from './cleaning/CleaningStats'
import ScheduleScreen from './ScheduleScreen'
import AnnouncementsScreen from './AnnouncementsScreen'
import ClubScreen from './club/ClubScreen'
import GeoGate from '../components/GeoGate'
import { useSession } from '../state/session'
import { useAnnouncements } from '../lib/useAnnouncements'
import { Map, BarChart, Calendar, Megaphone, Wrench, Book } from '../components/icons'

// Pestañas de visualización (Estadísticas vive dentro de Ruta, vía control
// segmentado, replicando el patrón del panel de admin).
const TABS = [
  { key: 'ruta', label: 'Ruta', icon: Map },
  { key: 'avisos', label: 'Avisos', icon: Megaphone },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'club', label: 'Club', icon: Book },
]
const SUBTITLE = { ruta: 'Tu ruta', avisos: 'Avisos', horario: 'Horarios', club: 'El club' }

export default function CleaningView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('ruta')
  const [rutaView, setRutaView] = useState('hoy')  // hoy | stats (Estadísticas)
  const [annOpen, setAnnOpen] = useState(false)   // aviso a coaches (no a mantenimiento)
  const [maintOpen, setMaintOpen] = useState(false)

  // Avisos del rol: alimenta la pestaña "Avisos" y el badge del navbar.
  const anns = useAnnouncements('cleaning', employee)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'ruta'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {tab === 'ruta' && (
          <>
            <SegmentedControl
              className="mb-4"
              options={[{ key: 'hoy', label: 'Hoy', icon: Map }, { key: 'stats', label: 'Estadísticas', icon: BarChart }]}
              value={rutaView} onChange={setRutaView}
            />
            {/* Solo la ruta del día pasa por el GeoGate: las estadísticas son
                consulta (la dueña de la empresa de limpieza las revisa desde
                fuera del gimnasio), igual que Horarios. */}
            {rutaView === 'hoy' ? (
              <GeoGate employee={employee}>
                <CleaningToday anns={anns.activos} onOpenAnns={() => setTab('avisos')} />
              </GeoGate>
            ) : (
              <CleaningStats />
            )}
          </>
        )}
        {/* Avisos fuera del GeoGate: son consulta, se leen también desde casa. */}
        {tab === 'avisos' && <AnnouncementsScreen store={anns} employee={employee} />}
        {/* Horarios queda accesible siempre (lectura); el trabajo del día se
            desbloquea estando en el gimnasio. */}
        {tab === 'horario' && <ScheduleScreen editable={false} />}
        {/* Club fuera del GeoGate: es consulta (documentos del club). */}
        {tab === 'club' && <ClubScreen employee={employee} />}
      </div>

      <AnnouncementSheet
        open={annOpen} onClose={() => setAnnOpen(false)} employee={employee}
        authorRole="cleaning" allowHighlight={false} fixedRoles={['coach', 'admin']} title="Aviso a coaches"
      />
      <ReportIncident target="mantenimiento" open={maintOpen} onClose={() => setMaintOpen(false)} employee={employee} />

      <BottomNav
        tabs={TABS.map((t) => (t.key === 'avisos' ? { ...t, badge: anns.unreadCount || undefined } : t))}
        active={tab}
        onChange={setTab}
        actions={[
          // Orden por frecuencia: lo más usado abajo, más cerca del pulgar.
          { icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Algo roto: le llega al técnico', onClick: () => setMaintOpen(true) },
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje a coaches y dirección', onClick: () => setAnnOpen(true) },
        ]}
      />
    </Screen>
  )
}
