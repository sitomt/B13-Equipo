import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import AnnouncementSheet from '../components/AnnouncementSheet'
import ReportIncident from '../components/ReportIncident'
import CleaningToday from './cleaning/CleaningToday'
import CleaningStats from './cleaning/CleaningStats'
import ScheduleScreen from './ScheduleScreen'
import GeoGate from '../components/GeoGate'
import { useSession } from '../state/session'
import { Map, BarChart, Calendar, Megaphone, Wrench } from '../components/icons'

const TABS = [
  { key: 'ruta', label: 'Ruta', icon: Map },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'stats', label: 'Estadísticas', icon: BarChart },
]
const SUBTITLE = { ruta: 'Tu ruta', horario: 'Horarios', stats: 'Estadísticas' }

export default function CleaningView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('ruta')
  const [annOpen, setAnnOpen] = useState(false)   // aviso a coaches (no a mantenimiento)
  const [maintOpen, setMaintOpen] = useState(false)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'ruta'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Horarios queda accesible siempre (lectura); el trabajo del día se
            desbloquea estando en el gimnasio. */}
        {tab === 'horario' ? (
          <ScheduleScreen editable={false} />
        ) : (
          <GeoGate employee={employee}>
            {tab === 'ruta' && <CleaningToday />}
            {tab === 'stats' && <CleaningStats />}
          </GeoGate>
        )}
      </div>

      <AnnouncementSheet
        open={annOpen} onClose={() => setAnnOpen(false)} employee={employee}
        authorRole="cleaning" allowHighlight={false} fixedRoles={['coach', 'admin']} title="Aviso a coaches"
      />
      <ReportIncident target="mantenimiento" open={maintOpen} onClose={() => setMaintOpen(false)} employee={employee} />

      <BottomNav
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={[
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje a coaches y dirección', tone: 'ink', onClick: () => setAnnOpen(true) },
          { icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Algo roto: le llega al técnico', tone: 'terracotta', onClick: () => setMaintOpen(true) },
        ]}
      />
    </Screen>
  )
}
