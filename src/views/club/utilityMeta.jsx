// Metadatos compartidos del Club: mapa nombre-de-icono → componente y roles.
// La categoría guarda su icono como texto (p.ej. 'Book'); aquí se resuelve al
// componente real. Fallback: Book.
import { Book, Alert, Key, Chat, User, MapPin, Clock, Settings, Wrench } from '../../components/icons'

export const CATEGORY_ICONS = { Book, Alert, Key, Chat, User, MapPin, Clock, Settings, Wrench }

export function categoryIcon(name) {
  return CATEGORY_ICONS[name] || Book
}

// Opciones de icono ofrecidas al crear/editar una categoría (~6-8).
export const ICON_OPTIONS = ['Book', 'Alert', 'Key', 'Chat', 'User', 'MapPin', 'Clock', 'Wrench']

// Roles no-admin a los que se puede restringir la visibilidad de un documento.
export const ROLE_OPTIONS = [
  { key: 'coach', label: 'Coaches' },
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'maintenance', label: 'Mantenimiento' },
]
export const ROLE_LABELS = { coach: 'Coaches', cleaning: 'Limpieza', maintenance: 'Mantenimiento', admin: 'Dirección' }

// Etiqueta corta de visibilidad para un doc ("Todo el equipo" o "Solo X, Y").
export function visibilityLabel(visibleRoles) {
  if (!visibleRoles || visibleRoles.length === 0) return 'Todo el equipo'
  return 'Solo ' + visibleRoles.map((r) => ROLE_LABELS[r] || r).join(', ')
}

// ¿Ve este empleado el documento? El admin ve siempre todo.
export function canSeeDoc(doc, employee) {
  if (employee?.role === 'admin') return true
  const roles = doc.visible_roles || []
  if (roles.length === 0) return true
  return roles.includes(employee?.role)
}
