import { supabase } from './supabase'
import { todayMadrid } from './date'
import { enqueue, isNetworkError } from './offline'

// Inserción resiliente para acciones de campo: si falla por falta de cobertura,
// se encola y se reintenta al volver la red. Devuelve { queued }.
async function resilientInsert(table, row) {
  try {
    const { error } = await supabase.from(table).insert(row)
    if (error) throw error
    return { queued: false }
  } catch (e) {
    if (isNetworkError(e)) { enqueue(table, row); return { queued: true } }
    throw e
  }
}

// =====================================================================
// Capa de acceso a datos. Cada acción se registra con quién/qué/cuándo
// para que sea analizable después.
// =====================================================================

// ---------- EMPLEADOS ----------
// Columnas seguras: nunca se selecciona `pin` (el PIN solo se valida en el servidor vía RPC).
const EMP_COLS = 'id, name, role, color, active, birth_date, photo_url, geofenced'

export async function listEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(EMP_COLS)
    .eq('active', true)
    .order('role')
    .order('name')
  if (error) throw error
  return data
}

// Todos los perfiles, incluidos los desactivados (para gestión del admin).
export async function listAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(EMP_COLS)
    .order('active', { ascending: false })
    .order('role')
    .order('name')
  if (error) throw error
  return data
}

// ---------- LOGIN / PIN (gate ligero, validado en servidor vía RPC) ----------
// Lista para la pantalla de login: id, name, role, color, has_pin (sin exponer el PIN).
export async function loginList() {
  const { data, error } = await supabase.rpc('employees_login_list')
  if (error) throw error
  return data
}

// Primer alta del PIN (solo si aún no tiene). Devuelve true si lo crea.
export async function setPin(employeeId, pin) {
  const { data, error } = await supabase.rpc('set_employee_pin', { p_id: employeeId, p_pin: pin })
  if (error) throw error
  return data
}

// Comprueba el PIN al entrar. Devuelve true si coincide.
export async function verifyPin(employeeId, pin) {
  const { data, error } = await supabase.rpc('verify_employee_pin', { p_id: employeeId, p_pin: pin })
  if (error) throw error
  return data
}

// Cambio del PIN por el propio empleado (exige el PIN actual). Devuelve true si lo cambia.
export async function changePin(employeeId, oldPin, newPin) {
  const { data, error } = await supabase.rpc('change_employee_pin', { p_id: employeeId, p_old: oldPin, p_new: newPin })
  if (error) throw error
  return data
}

// Reseteo por el admin: borra el PIN (el empleado lo recrea al entrar).
export async function clearPin(employeeId) {
  const { data, error } = await supabase.rpc('clear_employee_pin', { p_id: employeeId })
  if (error) throw error
  return data
}

// Alta de un nuevo perfil. Crea la fila en la BD (login simulado actual).
// `geofenced`: si true, solo puede fichar dentro de la geocerca del gym.
// El admin (responsable/dueño) ficha desde cualquier sitio → siempre false.
export async function createEmployee({ name, role, color, birth_date = null, geofenced = true }) {
  const { data, error } = await supabase
    .from('employees')
    .insert({ name, role, color, birth_date, geofenced: role === 'admin' ? false : geofenced })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, patch) {
  const { error } = await supabase.from('employees').update(patch).eq('id', id)
  if (error) throw error
}

// Baja lógica: conserva el histórico (fichajes, turnos, incidencias) y lo
// retira de la app. Reversible con updateEmployee(id, { active: true }).
export async function deactivateEmployee(id) {
  const { error } = await supabase.from('employees').update({ active: false }).eq('id', id)
  if (error) throw error
}

// ---------- FICHAJES ----------
const KIND_LABEL = {
  clock_in: 'Entrada',
  clock_out: 'Salida',
  break_start: 'Inicio pausa',
  break_end: 'Fin pausa',
  meal_start: 'Inicio comida',
  meal_end: 'Fin comida',
}
export { KIND_LABEL }

// Estado actual derivado del último fichaje de hoy.
// Devuelve: 'out' | 'working' | 'break' | 'meal'
export function deriveStatus(entries) {
  if (!entries || entries.length === 0) return 'out'
  const last = entries[entries.length - 1]
  switch (last.kind) {
    case 'clock_in':
    case 'break_end':
    case 'meal_end':
      return 'working'
    case 'break_start':
      return 'break'
    case 'meal_start':
      return 'meal'
    case 'clock_out':
      return 'out'
    default:
      return 'out'
  }
}

export async function todayEntries(employeeId) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', todayMadrid())
    .order('occurred_at', { ascending: true })
  if (error) throw error
  return data
}

export async function allTodayEntries() {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employee:employees(id,name,role,color)')
    .eq('work_date', todayMadrid())
    .order('occurred_at', { ascending: true })
  if (error) throw error
  return data
}

// `geo` opcional: { lat, lng, accuracy, inside } para auditoría del fichaje.
// `extra` opcional: p.ej. { auto_closed: true } para el cierre automático.
export async function addTimeEntry(employeeId, kind, notes = null, geo = null, extra = {}) {
  const row = { employee_id: employeeId, kind, notes, ...extra }
  if (geo) {
    row.lat = geo.lat ?? null
    row.lng = geo.lng ?? null
    row.accuracy_m = geo.accuracy ?? null
    row.inside = geo.inside ?? null
  }
  // Fichaje resiliente: nunca se pierde aunque no haya cobertura.
  return resilientInsert('time_entries', row)
}

// ---------- GEOCERCA DEL FICHAJE ----------
// Config única de la geocerca del gimnasio (centro, radio, buffer, gracia).
export async function getGeofence() {
  const { data, error } = await supabase.from('gym_geofence').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function updateGeofence(patch) {
  const { error } = await supabase
    .from('gym_geofence')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}

// Catch-up: cierra turnos olvidados de días anteriores. Devuelve cuántos cerró.
export async function reconcileOpenShifts() {
  const { data, error } = await supabase.rpc('reconcile_open_shifts')
  if (error) throw error
  return data
}

// ---------- CORRECCIONES DE FICHAJE (admin) ----------
// Fichajes de un empleado en un día concreto (para revisar/corregir).
export async function entriesForDay(employeeId, date) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', date)
    .order('occurred_at', { ascending: true })
  if (error) throw error
  return data
}

// Inserta un fichaje manual del admin a una hora concreta (corrección).
export async function addManualEntry(employeeId, kind, occurredAtISO, workDate) {
  const { error } = await supabase.from('time_entries').insert({
    employee_id: employeeId, kind, occurred_at: occurredAtISO, work_date: workDate,
    notes: 'Corrección manual (admin)',
  })
  if (error) throw error
}

export async function updateTimeEntry(id, patch) {
  const { error } = await supabase.from('time_entries').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTimeEntry(id) {
  const { error } = await supabase.from('time_entries').delete().eq('id', id)
  if (error) throw error
}

// ---------- PLANTILLAS ----------
export async function listTemplates(role) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('role', role)
    .eq('active', true)
    .order('section')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function listAllTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('role')
    .order('section')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createTemplate(t) {
  const { error } = await supabase.from('task_templates').insert(t)
  if (error) throw error
}

export async function updateTemplate(id, patch) {
  const { error } = await supabase.from('task_templates').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('task_templates').delete().eq('id', id)
  if (error) throw error
}

// ids: array of template ids in the desired order
export async function reorderTemplates(ids) {
  const updates = ids.map((id, i) => supabase.from('task_templates').update({ sort_order: i }).eq('id', id))
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
}

// ---------- COMPLETADOS ----------
export async function todayCompletions(role) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('role', role)
    .eq('work_date', todayMadrid())
    .order('completed_at', { ascending: true })
  if (error) throw error
  return data
}

export async function completeTask(template, employee, notes = null) {
  const row = {
    template_id: template.id,
    title: template.title,
    section: template.section,
    role: template.role,
    employee_id: employee.id,
    employee_name: employee.name,
    notes,
  }
  try {
    const { data, error } = await supabase.from('task_completions').insert(row).select().single()
    if (error) throw error
    return data // se devuelve para poder ofrecer "Deshacer" sin esperar al refetch
  } catch (e) {
    // Sin cobertura: se encola y se marca como hecha igualmente (sin "Deshacer").
    if (isNetworkError(e)) { enqueue('task_completions', row); return { id: null, _queued: true } }
    throw e
  }
}

export async function undoCompletion(completionId) {
  const { error } = await supabase.from('task_completions').delete().eq('id', completionId)
  if (error) throw error
}

// ---------- TAREAS PUNTUALES / AVISOS URGENTES ----------
export async function listAdHoc(targetRole) {
  const { data, error } = await supabase
    .from('ad_hoc_tasks')
    .select('*')
    .eq('target_role', targetRole)
    .eq('work_date', todayMadrid())
    .order('status')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function rangeAdHoc(targetRole, fromDate, toDate) {
  const { data, error } = await supabase
    .from('ad_hoc_tasks')
    .select('*')
    .eq('target_role', targetRole)
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createAdHoc(t) {
  const { error } = await supabase.from('ad_hoc_tasks').insert(t)
  if (error) throw error
}

export async function completeAdHoc(id, employee) {
  const { error } = await supabase
    .from('ad_hoc_tasks')
    .update({
      status: 'done',
      done_by: employee.id,
      done_by_name: employee.name,
      done_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

// ---------- FOTOS (Storage) ----------
export const PHOTO_BUCKET = 'Fotos Baktun'

// Sube una foto al bucket y devuelve su URL pública.
export async function uploadPhoto(file, folder = 'incidents') {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ---------- INCIDENCIAS INTERNAS (las resuelve el equipo) ----------
export async function listIncidencias() {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function reorderIncidencias(orderedIds) {
  await Promise.all(orderedIds.map((id, i) =>
    supabase.from('incidents').update({ sort_order: i }).eq('id', id)))
}

export async function createIncidencia(i) {
  const { error } = await supabase.from('incidents').insert(i)
  if (error) throw error
}

export async function updateIncidencia(id, patch) {
  const { error } = await supabase.from('incidents').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteIncidencia(id) {
  const { error } = await supabase.from('incidents').delete().eq('id', id)
  if (error) throw error
}

// ---------- TIPOS DE INCIDENCIA (etiquetas editables por el admin) ----------
export async function listIncidenciaTypes() {
  const { data, error } = await supabase
    .from('incidencia_types')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createIncidenciaType(label, sortOrder = 99) {
  const { error } = await supabase.from('incidencia_types').insert({ label, sort_order: sortOrder })
  if (error) throw error
}

export async function updateIncidenciaType(id, patch) {
  const { error } = await supabase.from('incidencia_types').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteIncidenciaType(id) {
  // Borrado lógico para no perder histórico de incidencias ya etiquetadas
  const { error } = await supabase.from('incidencia_types').update({ active: false }).eq('id', id)
  if (error) throw error
}

// ---------- ÁREAS / LOCALES (editables por el admin) ----------
// Los distintos locales de la instalación (Musculación, Pilates, Artes
// marciales, Clases dirigidas…). Quien reporta una incidencia elige el área.
export async function listAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createArea(name, sortOrder = 99) {
  const { error } = await supabase.from('areas').insert({ name, sort_order: sortOrder })
  if (error) throw error
}

export async function updateArea(id, patch) {
  const { error } = await supabase.from('areas').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteArea(id) {
  // Borrado lógico para no perder el área de los partes ya etiquetados
  const { error } = await supabase.from('areas').update({ active: false }).eq('id', id)
  if (error) throw error
}

// ---------- MANTENIMIENTO (partes del técnico externo, instalaciones) ----------
export async function listMaintenance() {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Reordena (drag & drop del admin): sort_order = posición en la lista.
export async function reorderMaintenance(orderedIds) {
  await Promise.all(orderedIds.map((id, i) =>
    supabase.from('maintenance_tasks').update({ sort_order: i }).eq('id', id)))
}

export async function createMaintenance(t) {
  const { error } = await supabase.from('maintenance_tasks').insert(t)
  if (error) throw error
}

export async function updateMaintenance(id, patch) {
  const { error } = await supabase.from('maintenance_tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteMaintenance(id) {
  const { error } = await supabase.from('maintenance_tasks').delete().eq('id', id)
  if (error) throw error
}

// ---------- MANTENIMIENTO PREVENTIVO (tareas recurrentes programadas) ----------
// El admin define plantillas que se materializan solas en su cola destino
// (maintenance_tasks o incidents) cuando llega la fecha. target: 'mantenimiento' | 'incidencia'.
export async function listRecurring(target) {
  const { data, error } = await supabase
    .from('recurring_tasks')
    .select('*')
    .eq('target', target)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRecurring(plan) {
  const { error } = await supabase.from('recurring_tasks').insert(plan)
  if (error) throw error
}

export async function updateRecurring(id, patch) {
  const { error } = await supabase.from('recurring_tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRecurring(id) {
  const { error } = await supabase.from('recurring_tasks').delete().eq('id', id)
  if (error) throw error
}

// "Catch-up": genera las tareas preventivas vencidas hasta hoy (idempotente).
// El cron diario también lo hace; esto evita depender solo de él y permite ver el efecto al instante.
export async function runDueRecurring() {
  const { data, error } = await supabase.rpc('generate_due_recurring_tasks')
  if (error) throw error
  return data // nº de tareas generadas
}

// ---------- HORARIOS (shifts) ----------
export async function listShifts(fromDate, toDate) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .order('work_date')
    .order('start_time')
  if (error) throw error
  return data
}

// Varias franjas por día permitidas: se gestionan por id.
export async function createShift(shift) {
  const { data, error } = await supabase.from('shifts').insert(shift).select().single()
  if (error) throw error
  return data
}

export async function updateShift(id, patch) {
  const { error } = await supabase.from('shifts').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteShift(id) {
  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) throw error
}

// ---------- PUBLICACIÓN DE HORARIO POR SEMANA ----------
export async function getScheduleWeek(weekStart) {
  const { data, error } = await supabase
    .from('schedule_weeks')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function publishWeek(weekStart, employeeId) {
  const { error } = await supabase.from('schedule_weeks').upsert({
    week_start: weekStart,
    status: 'published',
    published_at: new Date().toISOString(),
    published_by: employeeId,
  }, { onConflict: 'week_start' })
  if (error) throw error
}

export async function unpublishWeek(weekStart) {
  const { error } = await supabase.from('schedule_weeks').upsert({
    week_start: weekStart,
    status: 'draft',
    published_at: null,
  }, { onConflict: 'week_start' })
  if (error) throw error
}

// ---------- FICHAJES / COMPLETADOS POR RANGO (horas y estadísticas) ----------
export async function rangeTimeEntries(fromDate, toDate) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('id, employee_id, kind, occurred_at, work_date')
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .order('occurred_at')
  if (error) throw error
  return data
}

export async function rangeCompletions(fromDate, toDate) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
  if (error) throw error
  return data
}

// ---------- COMUNICACIÓN INTERNA ----------
export async function activeAnnouncements(role) {
  const today = todayMadrid()
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .lte('starts_on', today)
    .gte('ends_on', today)
    .contains('target_roles', [role])
    .order('priority', { ascending: false })
    .order('ends_on', { ascending: true })
  if (error) throw error
  return data
}

export async function listAllAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('active', { ascending: false })
    .order('ends_on', { ascending: false })
  if (error) throw error
  return data
}

export async function createAnnouncement(a) {
  const { error } = await supabase.from('announcements').insert(a)
  if (error) throw error
  // Notificación push a los destinatarios (no bloquea ni rompe el alta si falla).
  notifyAnnouncement(a)
}

// ---------- WEB PUSH (notificaciones tipo banner) ----------
// Guarda la suscripción del dispositivo para este empleado.
// ---------- ACUSE DE LECTURA DE AVISOS ----------
// Marca un aviso como leído por un empleado (idempotente).
export async function markAnnouncementRead(announcementId, employeeId) {
  if (!announcementId || !employeeId) return
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, employee_id: employeeId }, { onConflict: 'announcement_id,employee_id', ignoreDuplicates: true })
  if (error) throw error
}

// Todas las lecturas (para que el admin vea quién/cuántos han leído cada aviso).
export async function listAnnouncementReads() {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id, employee_id')
  if (error) throw error
  return data
}

export async function savePushSubscription(employeeId, { endpoint, p256dh, auth }) {
  const { error } = await supabase.from('push_subscriptions').upsert(
    { employee_id: employeeId, endpoint, p256dh, auth, user_agent: navigator.userAgent },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

// Llama a la Edge Function que envía el push a los destinatarios del aviso.
async function notifyAnnouncement(a) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        title: a.title,
        body: a.body || '',
        target_roles: a.target_roles || [],
        tag: 'aviso',
        url: '/',
      },
    })
  } catch { /* el push es best-effort: el aviso ya está guardado */ }
}

export async function updateAnnouncement(id, patch) {
  const { error } = await supabase.from('announcements').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- FEEDBACK (coach → dirección/admin) ----------
// Tipos: 'cliente' | 'sugerencia' (a dirección) | 'app' (usabilidad).
export async function listFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createFeedback(f) {
  const { error } = await supabase.from('feedback').insert(f)
  if (error) throw error
}

export async function updateFeedback(id, patch) {
  const { error } = await supabase.from('feedback').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) throw error
}
