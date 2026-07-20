import OverlayScreen from '../../components/OverlayScreen'
import AdminTeam from './AdminTeam'

// Gestión de perfiles del equipo (solo admin), como pantalla dedicada del Perfil.
export default function TeamOverlay({ onClose }) {
  return (
    <OverlayScreen title="Equipo" onClose={onClose}>
      <AdminTeam />
    </OverlayScreen>
  )
}
