import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import ScheduleOverlay from '../components/ScheduleOverlay'
import AnnouncementSheet from '../components/AnnouncementSheet'
import CleaningToday from './cleaning/CleaningToday'
import CleaningStats from './cleaning/CleaningStats'
import GeoGate from '../components/GeoGate'
import { useSession } from '../state/session'
import { Map, BarChart } from '../components/icons'

const TABS = [
  { key: 'ruta', label: 'Ruta', icon: Map },
  { key: 'stats', label: 'Estadísticas', icon: BarChart },
]
const SUBTITLE = { ruta: 'Tu ruta', stats: 'Estadísticas' }

export default function CleaningView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('ruta')
  const [schedule, setSchedule] = useState(false)
  const [annOpen, setAnnOpen] = useState(false) // aviso a coaches (no a mantenimiento)

  if (schedule) return <ScheduleOverlay onClose={() => setSchedule(false)} />

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} onCalendar={() => setSchedule(true)} onAnnounce={() => setAnnOpen(true)} />

      <div className="mx-auto max-w-md px-4 pt-4">
        <GeoGate employee={employee}>
          {tab === 'ruta' && <CleaningToday />}
          {tab === 'stats' && <CleaningStats />}
        </GeoGate>
      </div>

      <AnnouncementSheet
        open={annOpen} onClose={() => setAnnOpen(false)} employee={employee}
        authorRole="cleaning" allowHighlight={false} fixedRoles={['coach', 'admin']} title="Aviso a coaches"
      />

      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </Screen>
  )
}
