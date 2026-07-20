import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import ReportIncident from '../components/ReportIncident'
import AnnouncementSheet from '../components/AnnouncementSheet'
import GeoGate from '../components/GeoGate'
import MaintenanceToday from './maintenance/MaintenanceToday'
import ScheduleScreen from './ScheduleScreen'
import AnnouncementsScreen from './AnnouncementsScreen'
import { useSession } from '../state/session'
import { useAnnouncements } from '../lib/useAnnouncements'
import { Wrench, Calendar, Megaphone } from '../components/icons'

const TABS = [
  { key: 'hoy', label: 'Hoy', icon: Wrench },
  { key: 'avisos', label: 'Avisos', icon: Megaphone },
  { key: 'horario', label: 'Horarios', icon: Calendar },
]
const SUBTITLE = { hoy: 'Tus reparaciones', avisos: 'Avisos', horario: 'Horarios' }

export default function MaintenanceView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('hoy')
  const [reportOpen, setReportOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false) // aviso a coaches (no a limpieza)
  const [refresh, setRefresh] = useState(0)     // fuerza recarga tras crear tarea

  // Avisos del rol: alimenta la pestaña "Avisos" y el badge del navbar.
  const anns = useAnnouncements('maintenance', employee)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'hoy'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Horarios y Avisos fuera del GeoGate: son consulta, se leen también
            desde casa. El trabajo del día se desbloquea estando en el gym. */}
        {tab === 'horario' ? (
          <ScheduleScreen editable={false} />
        ) : tab === 'avisos' ? (
          <AnnouncementsScreen store={anns} employee={employee} />
        ) : (
          <GeoGate employee={employee}>
            <MaintenanceToday refresh={refresh} anns={anns.activos} onOpenAnns={() => setTab('avisos')} />
          </GeoGate>
        )}
      </div>

      <ReportIncident
        open={reportOpen} onClose={() => setReportOpen(false)} employee={employee}
        onCreated={() => setRefresh((n) => n + 1)}
        heading="Añadir tarea de mantenimiento"
        desc="Registra una avería o tarea de las instalaciones para gestionarla."
      />
      <AnnouncementSheet
        open={annOpen} onClose={() => setAnnOpen(false)} employee={employee}
        authorRole="maintenance" allowHighlight={false} fixedRoles={['coach', 'admin']} title="Mandar aviso"
      />

      <BottomNav
        tabs={TABS.map((t) => (t.key === 'avisos' ? { ...t, badge: anns.unreadCount || undefined } : t))}
        active={tab}
        onChange={setTab}
        actions={[
          // Orden por frecuencia: lo más usado abajo, más cerca del pulgar.
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje a coaches y dirección', onClick: () => setAnnOpen(true) },
          { icon: Wrench, label: 'Nueva tarea', hint: 'Avería o tarea de las instalaciones', onClick: () => setReportOpen(true) },
        ]}
      />
    </Screen>
  )
}
