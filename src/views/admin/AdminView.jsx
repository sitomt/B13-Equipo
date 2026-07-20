import { useState } from 'react'
import { Header, Screen } from '../../components/AppShell'
import BottomNav from '../../components/BottomNav'
import { SegmentedControl } from '../../components/controls'
import AnnouncementSheet from '../../components/AnnouncementSheet'
import CleaningRequest from '../../components/CleaningRequest'
import ReportIncident from '../../components/ReportIncident'
import AdminDashboard from './AdminDashboard'
import AdminIncidents from './AdminIncidents'
import AdminAnnouncements from './AdminAnnouncements'
import AgendaOverview from './AgendaOverview'
import AgendaEditorScreen from './AgendaEditorScreen'
import AdminStats from './AdminStats'
import AdminFeedback from './AdminFeedback'
import ScheduleScreen from '../ScheduleScreen'
import ScheduleEditorScreen from '../schedule/ScheduleEditorScreen'
import { useSession } from '../../state/session'
import { Activity, Megaphone, Wrench, Calendar, BarChart, Chat, Spray, Alert, Book, Pencil } from '../../components/icons'

// 5 pestañas de VISUALIZACIÓN (Stats vive dentro de Resumen y Feedback dentro
// de Avisos, vía control segmentado). Equipo vive en el Perfil (avatar).
// Toda creación/edición sale del "+" del navbar.
const TABS = [
  { key: 'dash', label: 'Resumen', icon: Activity },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'inc', label: 'Incidencias', icon: Wrench },
  { key: 'comm', label: 'Avisos', icon: Megaphone },
  { key: 'agenda', label: 'Agenda', icon: Book },
]
const SUBTITLE = { dash: 'Panel de control', horario: 'Horarios', inc: 'Incidencias', comm: 'Avisos', agenda: 'Agenda' }

export default function AdminView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('dash')
  const [dashView, setDashView] = useState('hoy')   // hoy | hist (Stats)
  const [commView, setCommView] = useState('avisos') // avisos | feedback
  const [annOpen, setAnnOpen] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)
  const [maintOpen, setMaintOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [schedEditor, setSchedEditor] = useState(false)
  const [agendaEditor, setAgendaEditor] = useState(false)

  return (
    <Screen>
      <Header subtitle={SUBTITLE[tab]} primary={tab === 'dash'} />
      <div className="mx-auto max-w-md px-4 pt-4">
        {tab === 'dash' && (
          <>
            <SegmentedControl
              className="mb-4"
              options={[{ key: 'hoy', label: 'Hoy', icon: Activity }, { key: 'hist', label: 'Histórico', icon: BarChart }]}
              value={dashView} onChange={setDashView}
            />
            {dashView === 'hoy' ? <AdminDashboard /> : <AdminStats />}
          </>
        )}
        {tab === 'horario' && <ScheduleScreen />}
        {tab === 'inc' && <AdminIncidents />}
        {tab === 'comm' && (
          <>
            <SegmentedControl
              className="mb-4"
              options={[{ key: 'avisos', label: 'Avisos', icon: Megaphone }, { key: 'feedback', label: 'Feedback', icon: Chat }]}
              value={commView} onChange={setCommView}
            />
            {commView === 'avisos' ? <AdminAnnouncements /> : <AdminFeedback />}
          </>
        )}
        {tab === 'agenda' && <AgendaOverview />}
      </div>

      <AnnouncementSheet open={annOpen} onClose={() => setAnnOpen(false)} employee={employee} />
      <CleaningRequest open={cleanOpen} onClose={() => setCleanOpen(false)} employee={employee} />
      <ReportIncident target="mantenimiento" open={maintOpen} onClose={() => setMaintOpen(false)} employee={employee} />
      <ReportIncident target="incidencia" open={incidentOpen} onClose={() => setIncidentOpen(false)} employee={employee} />
      {schedEditor && <ScheduleEditorScreen onClose={() => setSchedEditor(false)} />}
      {agendaEditor && <AgendaEditorScreen onClose={() => setAgendaEditor(false)} />}

      <BottomNav
        tabs={TABS}
        active={tab}
        onChange={setTab}
        actions={[
          { icon: Alert, label: 'Nueva incidencia', hint: 'Interna: coaches y dirección', tone: 'ink', onClick: () => setIncidentOpen(true) },
          { icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Le llega al técnico', tone: 'terracotta', onClick: () => setMaintOpen(true) },
          { icon: Spray, label: 'Nueva tarea de limpieza', hint: 'Le llega a limpieza', tone: 'bronze', onClick: () => setCleanOpen(true) },
          { icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje al equipo', tone: 'ink', onClick: () => setAnnOpen(true) },
          { icon: Calendar, label: 'Editar horarios', hint: 'Asignar turnos y publicar la semana', tone: 'bronze', onClick: () => setSchedEditor(true) },
          { icon: Pencil, label: 'Editar agenda', hint: 'Tareas diarias y preventivas', tone: 'ink', onClick: () => setAgendaEditor(true) },
        ]}
      />
    </Screen>
  )
}
