import { useState } from 'react'
import { Header, Screen } from '../components/AppShell'
import BottomNav from '../components/BottomNav'
import ReportIncident from '../components/ReportIncident'
import CleaningRequest from '../components/CleaningRequest'
import FeedbackSheet from '../components/FeedbackSheet'
import AnnouncementSheet from '../components/AnnouncementSheet'
import CoachToday from './coach/CoachToday'
import CoachGym from './coach/CoachGym'
import ScheduleScreen from './ScheduleScreen'
import GeoGate from '../components/GeoGate'
import { useSession } from '../state/session'
import { Activity, Dumbbell, Calendar, Alert, Wrench, Spray, Chat, Megaphone } from '../components/icons'

const TABS = [
  { key: 'hoy', label: 'Hoy', icon: Activity },
  { key: 'gym', label: 'El gym', icon: Dumbbell },
  { key: 'horario', label: 'Horarios', icon: Calendar },
]
const SUBTITLE = { hoy: 'Tu día', gym: 'El gym', horario: 'Horarios' }

export default function CoachView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('hoy')
  const [reportOpen, setReportOpen] = useState(false)     // mantenimiento (instalaciones)
  const [incidentOpen, setIncidentOpen] = useState(false) // incidencia interna
  const [cleanOpen, setCleanOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'hoy'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Horarios queda accesible siempre (lectura); el trabajo del día se
            desbloquea estando en el gimnasio. */}
        {tab === 'horario' ? (
          <ScheduleScreen editable={false} />
        ) : (
          <GeoGate employee={employee}>
            {tab === 'hoy' && <CoachToday />}
            {tab === 'gym' && <CoachGym />}
          </GeoGate>
        )}
      </div>

      <ReportIncident target="incidencia" open={incidentOpen} onClose={() => setIncidentOpen(false)} employee={employee} />
      <ReportIncident target="mantenimiento" open={reportOpen} onClose={() => setReportOpen(false)} employee={employee} />
      <CleaningRequest open={cleanOpen} onClose={() => setCleanOpen(false)} employee={employee} />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} employee={employee} />
      <AnnouncementSheet open={annOpen} onClose={() => setAnnOpen(false)} employee={employee} authorRole="coach" allowHighlight={false} />

      <BottomNav
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={[
          { icon: Alert, label: 'Nueva incidencia', hint: 'Interna: la ven coaches y dirección', tone: 'ink', onClick: () => setIncidentOpen(true) },
          { icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Algo roto: le llega al técnico', tone: 'terracotta', onClick: () => setReportOpen(true) },
          { icon: Spray, label: 'Nueva tarea de limpieza', hint: 'Algo sucio: le llega a limpieza', tone: 'bronze', onClick: () => setCleanOpen(true) },
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje al equipo', tone: 'ink', onClick: () => setAnnOpen(true) },
          { icon: Chat, label: 'Nuevo feedback', hint: 'Sugerencia a dirección', tone: 'ink', onClick: () => setFeedbackOpen(true) },
        ]}
      />
    </Screen>
  )
}
