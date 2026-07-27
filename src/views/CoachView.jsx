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
import AnnouncementsScreen from './AnnouncementsScreen'
import ClubScreen from './club/ClubScreen'
import GeoGate from '../components/GeoGate'
import { useSession } from '../state/session'
import { useAnnouncements } from '../lib/useAnnouncements'
import { Activity, Dumbbell, Calendar, Alert, Wrench, Spray, Chat, Megaphone, Book } from '../components/icons'

const TABS = [
  { key: 'hoy', label: 'Hoy', icon: Activity },
  { key: 'gym', label: 'El gym', icon: Dumbbell },
  { key: 'avisos', label: 'Avisos', icon: Megaphone },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'club', label: 'Club', icon: Book },
]
const SUBTITLE = { hoy: 'Tu día', gym: 'El gym', avisos: 'Avisos', horario: 'Horarios', club: 'El club' }

export default function CoachView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('hoy')
  const [reportOpen, setReportOpen] = useState(false)     // mantenimiento (instalaciones)
  const [incidentOpen, setIncidentOpen] = useState(false) // incidencia interna
  const [cleanOpen, setCleanOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false)

  // Avisos del rol: alimenta la pestaña "Avisos" y el badge del navbar.
  const anns = useAnnouncements('coach', employee)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'hoy'} />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Horarios y Avisos quedan accesibles siempre (son consulta: se leen
            también desde casa); el trabajo del día se desbloquea estando en
            el gimnasio. */}
        {tab === 'horario' ? (
          <ScheduleScreen editable={false} />
        ) : tab === 'avisos' ? (
          <AnnouncementsScreen store={anns} employee={employee} />
        ) : tab === 'club' ? (
          <ClubScreen employee={employee} />
        ) : (
          <GeoGate employee={employee}>
            {tab === 'hoy' && <CoachToday anns={anns.unreadAnnouncements} onOpenAnns={() => setTab('avisos')} />}
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
        tabs={TABS.map((t) => (t.key === 'avisos' ? { ...t, badge: anns.unreadCount || undefined } : t))}
        active={tab}
        onChange={setTab}
        actions={[
          // Orden por frecuencia: lo más usado abajo, más cerca del pulgar.
          { icon: Chat, label: 'Nuevo feedback', hint: 'Sugerencia a dirección', onClick: () => setFeedbackOpen(true) },
          { icon: Spray, label: 'Nueva tarea de limpieza', hint: 'Algo sucio: le llega a limpieza', onClick: () => setCleanOpen(true) },
          { icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Algo roto: le llega al técnico', onClick: () => setReportOpen(true) },
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje al equipo', onClick: () => setAnnOpen(true) },
          { icon: Alert, label: 'Nueva incidencia', hint: 'Interna: la ven coaches y dirección', onClick: () => setIncidentOpen(true) },
        ]}
      />
    </Screen>
  )
}
