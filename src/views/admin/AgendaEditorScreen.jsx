import OverlayScreen from '../../components/OverlayScreen'
import AdminTemplates from './AdminTemplates'

// Pantalla dedicada de EDICIÓN de la agenda (desde "+ → Editar agenda").
// Mantiene el 100% de la funcionalidad: diarias (con drag&drop y recurrentes
// intra-día) y preventivas.
export default function AgendaEditorScreen({ onClose }) {
  return (
    <OverlayScreen title="Editar agenda" onClose={onClose}>
      <AdminTemplates />
    </OverlayScreen>
  )
}
