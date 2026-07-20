import { useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { SegmentedControl } from '../../components/controls'
import { Book, Pencil } from '../../components/icons'
import AgendaOverview from './AgendaOverview'
import AdminTemplates from './AdminTemplates'

// Pantalla única de la Agenda (desde "+ → Agenda"): visualización y edición
// unificadas vía control segmentado. "Ver" muestra qué tiene programado cada
// equipo; "Editar" mantiene el 100% de la funcionalidad del editor: diarias
// (con drag&drop y recurrentes intra-día) y preventivas.
export default function AgendaEditorScreen({ onClose }) {
  const [mode, setMode] = useState('ver') // ver | editar

  return (
    <OverlayScreen title="Agenda" onClose={onClose}>
      <SegmentedControl
        className="mb-4"
        options={[{ key: 'ver', label: 'Ver', icon: Book }, { key: 'editar', label: 'Editar', icon: Pencil }]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'ver' ? <AgendaOverview onEdit={() => setMode('editar')} /> : <AdminTemplates />}
    </OverlayScreen>
  )
}
