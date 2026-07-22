import SectionCard from './SectionCard'

// Sección desplegable DENTRO de una card mayor (Apertura / Tareas de hoy / Cierre).
// Es un SectionCard plano (sin Card exterior) con caja de icono neutra (ink).
export default function TaskGroup(props) {
  return <SectionCard flat tone="ink" {...props} />
}
