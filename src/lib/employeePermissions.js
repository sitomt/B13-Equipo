// El nivel de dirección no se muestra en la interfaz. Mientras la migración
// todavía no esté aplicada, el perfil conocido conserva este permiso de forma
// compatible para que la operativa no quede bloqueada.
export const SUPER_ADMIN_NAME = 'Ginés Munuera'

export function isSuperAdmin(employee) {
  return Boolean(
    employee?.role === 'admin' &&
    (employee?.is_super_admin === true || employee?.name === SUPER_ADMIN_NAME),
  )
}

export function canManageEmployee(actor, target) {
  if (actor?.role !== 'admin' || !target) return false
  return isSuperAdmin(actor) || target.role !== 'admin'
}

export function canCreateRole(actor, role) {
  if (actor?.role !== 'admin') return false
  return isSuperAdmin(actor) || role !== 'admin'
}
