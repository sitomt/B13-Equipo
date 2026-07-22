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
import AgendaEditorScreen from './AgendaEditorScreen'
import AdminStats from './AdminStats'
import AdminFeedback from './AdminFeedback'
import ScheduleScreen from '../ScheduleScreen'
import ScheduleEditorScreen from '../schedule/ScheduleEditorScreen'
import ClubScreen from '../club/ClubScreen'
import { useSession } from '../../state/session'
import { useAnnouncements } from '../../lib/useAnnouncements'
import { Activity, Megaphone, Wrench, Calendar, BarChart, Chat, Spray, Alert, Book } from '../../components/icons'

// 5 pestañas de VISUALIZACIÓN (Stats vive dentro de Resumen y Feedback dentro
// de Avisos, vía control segmentado). Equipo, áreas, etiquetas y franjas viven
// en Club → Gestión; la Agenda en su pantalla única ("+ → Agenda"). Toda
// creación/edición sale del "+" del navbar.
const TABS = [
  { key: 'dash', label: 'Resumen', icon: Activity },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'inc', label: 'Incidencias', icon: Wrench },
  { key: 'comm', label: 'Avisos', icon: Megaphone },
  { key: 'club', label: 'Club', icon: Book },
]
const SUBTITLE = { dash: 'Panel de control', horario: 'Horarios', inc: 'Incidencias', comm: 'Avisos', club: 'El club' }

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

  // Avisos + conversación del admin: alimenta la pestaña Avisos y el badge
  // del navbar (solo comentarios nuevos; el admin no tiene avisos "sin leer").
  const anns = useAnnouncements('admin', employee)

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
            {dashView === 'hoy' ? <AdminDashboard onOpenAnns={() => { setTab('comm'); setCommView('avisos') }} /> : <AdminStats />}
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
            {commView === 'avisos' ? <AdminAnnouncements store={anns} /> : <AdminFeedback />}
          </>
        )}
        {/* Club: documentos del gym + gestión (equipo, áreas, etiquetas, franjas). */}
        {tab === 'club' && <ClubScreen employee={employee} />}
      </div>

      <AnnouncementSheet open={annOpen} onClose={() => setAnnOpen(false)} employee={employee} />
      <CleaningRequest open={cleanOpen} onClose={() => setCleanOpen(false)} employee={employee} />
      <ReportIncident target="mantenimiento" open={maintOpen} onClose={() => setMaintOpen(false)} employee={employee} />
      <ReportIncident target="incidencia" open={incidentOpen} onClose={() => setIncidentOpen(false)} employee={employee} />
      {schedEditor && <ScheduleEditorScreen onClose={() => setSchedEditor(false)} />}
      {agendaEditor && <AgendaEditorScreen onClose={() => setAgendaEditor(false)} />}

      <BottomNav
        tabs={TABS.map((t) => (t.key === 'comm' ? { ...t, badge: anns.unreadCount || undefined } : t))}
        active={tab}
        onChange={setTab}
        actions={[
          // Orden por frecuencia: lo más usado abajo, más cerca del pulgar.
          { group: 'Gestionar', icon: Calendar, label: 'Editar horarios', hint: 'Asignar turnos y publicar la semana', onClick: () => setSchedEditor(true) },
          { group: 'Gestionar', icon: Book, label: 'Agenda', hint: 'Ver y editar tareas diarias y preventivas', onClick: () => setAgendaEditor(true) },
          { group: 'Registrar', icon: Spray, label: 'Nueva tarea de limpieza', hint: 'Le llega a limpieza', onClick: () => setCleanOpen(true) },
          { group: 'Registrar', icon: Wrench, label: 'Nueva tarea de mantenimiento', hint: 'Le llega al técnico', onClick: () => setMaintOpen(true) },
          { group: 'Registrar', icon: Megaphone, label: 'Nuevo aviso', hint: 'Mensaje al equipo', onClick: () => setAnnOpen(true) },
          { group: 'Registrar', icon: Alert, label: 'Nueva incidencia', hint: 'Interna: coaches y dirección', onClick: () => setIncidentOpen(true) },
        ]}
      />
    </Screen>
  )
}
