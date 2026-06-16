import { useState } from 'react'
import { Header, Screen } from '../../components/AppShell'
import BottomNav from '../../components/BottomNav'
import SpeedDial from '../../components/SpeedDial'
import AnnouncementSheet from '../../components/AnnouncementSheet'
import CleaningRequest from '../../components/CleaningRequest'
import ReportIncident from '../../components/ReportIncident'
import AdminDashboard from './AdminDashboard'
import AdminIncidents from './AdminIncidents'
import AdminAnnouncements from './AdminAnnouncements'
import AdminTemplates from './AdminTemplates'
import AdminStats from './AdminStats'
import AdminTeam from './AdminTeam'
import AdminFeedback from './AdminFeedback'
import ScheduleScreen from '../ScheduleScreen'
import { useSession } from '../../state/session'
import { Activity, Megaphone, Settings, Wrench, Calendar, BarChart, User, Chat, Spray, Alert } from '../../components/icons'

// 6 pestañas fijas (caben sin scroll): Stats vive dentro de Resumen y
// Feedback dentro de Avisos, vía control segmentado. Nada queda oculto.
const TABS = [
  { key: 'dash', label: 'Resumen', icon: Activity },
  { key: 'horario', label: 'Horarios', icon: Calendar },
  { key: 'inc', label: 'Incidencias', icon: Wrench },
  { key: 'comm', label: 'Avisos', icon: Megaphone },
  { key: 'equipo', label: 'Equipo', icon: User },
  { key: 'tpl', label: 'Plantillas', icon: Settings },
]

// Control segmentado para alternar dos sub-vistas dentro de una pestaña.
function SubTabs({ options, value, onChange }) {
  return (
    <div className="mb-4 flex gap-1 rounded-2xl bg-ink/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition ${
            value === o.key ? 'bg-white text-ink shadow-card' : 'text-ink/50'
          }`}
        >
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminView() {
  const { employee } = useSession()
  const [tab, setTab] = useState('dash')
  const [dashView, setDashView] = useState('hoy')   // hoy | hist (Stats)
  const [commView, setCommView] = useState('avisos') // avisos | feedback
  const [annOpen, setAnnOpen] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)
  const [maintOpen, setMaintOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)

  return (
    <Screen>
      <Header subtitle="Panel de control" />
      <div className="mx-auto max-w-md px-4 pt-4">
        {tab === 'dash' && (
          <>
            <SubTabs
              options={[{ key: 'hoy', label: 'Hoy', icon: Activity }, { key: 'hist', label: 'Histórico', icon: BarChart }]}
              value={dashView} onChange={setDashView}
            />
            {dashView === 'hoy' ? <AdminDashboard /> : <AdminStats />}
          </>
        )}
        {tab === 'horario' && <ScheduleScreen editable />}
        {tab === 'inc' && <AdminIncidents />}
        {tab === 'comm' && (
          <>
            <SubTabs
              options={[{ key: 'avisos', label: 'Avisos', icon: Megaphone }, { key: 'feedback', label: 'Feedback', icon: Chat }]}
              value={commView} onChange={setCommView}
            />
            {commView === 'avisos' ? <AdminAnnouncements /> : <AdminFeedback />}
          </>
        )}
        {tab === 'equipo' && <AdminTeam />}
        {tab === 'tpl' && <AdminTemplates />}
      </div>

      {/* Acciones rápidas del responsable: comunicar y delegar sobre la marcha. */}
      <SpeedDial
        actions={[
          { icon: Megaphone, label: 'Aviso al equipo', tone: 'ink', onClick: () => setAnnOpen(true) },
          { icon: Spray, label: 'Tarea urgente · Limpieza', tone: 'bronze', onClick: () => setCleanOpen(true) },
          { icon: Wrench, label: 'Algo roto · Mantenimiento', tone: 'terracotta', onClick: () => setMaintOpen(true) },
          { icon: Alert, label: 'Incidencia interna', tone: 'ink', onClick: () => setIncidentOpen(true) },
        ]}
      />
      <AnnouncementSheet open={annOpen} onClose={() => setAnnOpen(false)} employee={employee} />
      <CleaningRequest open={cleanOpen} onClose={() => setCleanOpen(false)} employee={employee} />
      <ReportIncident target="mantenimiento" open={maintOpen} onClose={() => setMaintOpen(false)} employee={employee} />
      <ReportIncident target="incidencia" open={incidentOpen} onClose={() => setIncidentOpen(false)} employee={employee} />

      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </Screen>
  )
}
