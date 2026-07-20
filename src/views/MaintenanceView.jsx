import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import ReportIncident from '../components/ReportIncident'
import AnnouncementSheet from '../components/AnnouncementSheet'
import GeoGate from '../components/GeoGate'
import MaintenanceToday from './maintenance/MaintenanceToday'
import ScheduleScreen from './ScheduleScreen'
import { useSession } from '../state/session'
import { Wrench, Calendar, Megaphone } from '../components/icons'

const TABS = [
  { key: 'hoy', label: 'Hoy', icon: Wrench },
  { key: 'horario', label: 'Horarios', icon: Calendar },
]
const SUBTITLE = { hoy: 'Tus reparaciones', horario: 'Horarios' }

export default function MaintenanceView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('hoy')
  const [reportOpen, setReportOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false) // aviso a coaches (no a limpieza)
  const [refresh, setRefresh] = useState(0)     // fuerza recarga tras crear tarea

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'hoy'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {tab === 'horario' ? (
          <ScheduleScreen editable={false} />
        ) : (
          <GeoGate employee={employee}>
            <MaintenanceToday refresh={refresh} />
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
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={[
          { icon: Wrench, label: 'Nueva tarea', hint: 'Avería o tarea de las instalaciones', tone: 'bronze', onClick: () => setReportOpen(true) },
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje a coaches y dirección', tone: 'ink', onClick: () => setAnnOpen(true) },
        ]}
      />
    </Screen>
  )
}
