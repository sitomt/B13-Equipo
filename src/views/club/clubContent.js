const PAYLOAD_PREFIX = 'B13_CLUB_V1:'

export const CLUB_MODULES = [
  {
    key: 'manuals',
    title: 'Manuales y protocolos',
    categoryNames: ['Manuales y protocolos', 'Manuals and protocols'],
    icon: 'Book',
  },
  {
    key: 'policies',
    title: 'Políticas',
    categoryNames: ['Políticas', 'Policies'],
    icon: 'Alert',
  },
  {
    key: 'contacts',
    title: 'Contactos útiles',
    categoryNames: ['Contactos útiles', 'Contacts'],
    icon: 'User',
  },
  {
    key: 'meetings',
    title: 'Reuniones',
    categoryNames: ['Reuniones', 'Meetings'],
    icon: 'Chat',
  },
  {
    key: 'credentials',
    title: 'Accesos y contraseñas',
    categoryNames: ['Accesos y contraseñas', 'Access/passwords'],
    icon: 'Key',
  },
]

function normalize(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

const MODULE_BY_CATEGORY = Object.fromEntries(
  CLUB_MODULES.flatMap((module) =>
    module.categoryNames.map((categoryName) => [normalize(categoryName), module]),
  ),
)

function legacyPayload(kind, body, extra = {}) {
  const content = (body || '').trim()
  const firstLine = content.split('\n').find((line) => line.trim())?.trim() || ''
  return {
    kind,
    content,
    summary: firstLine.slice(0, 140),
    status: 'published',
    version: 1,
    archived_at: null,
    legacy: true,
    ...extra,
  }
}

export function moduleForCategory(category) {
  return MODULE_BY_CATEGORY[normalize(category?.name)] || null
}

export function categoryForModule(categories, moduleKey) {
  const config = CLUB_MODULES.find((module) => module.key === moduleKey)
  if (!config) return null
  const names = new Set(config.categoryNames.map(normalize))
  return (categories || []).find(
    (category) => names.has(normalize(category.name)),
  ) || null
}

export function parseClubPayload(doc, moduleKey) {
  const body = doc?.body || ''
  if (body.startsWith(PAYLOAD_PREFIX)) {
    try {
      return {
        archived_at: null,
        status: 'published',
        version: 1,
        ...JSON.parse(body.slice(PAYLOAD_PREFIX.length)),
      }
    } catch {
      return legacyPayload(moduleKey === 'policies' ? 'policy' : 'article', body)
    }
  }

  if (moduleKey === 'contacts') return legacyPayload('legacy-contact-list', body)
  if (moduleKey === 'credentials') return legacyPayload('legacy-credential-list', body)
  if (moduleKey === 'meetings') return legacyPayload('meeting', body)
  if (moduleKey === 'policies') return legacyPayload('policy', body, { type: 'policy' })
  return legacyPayload('article', body, {
    type: normalize(doc?.title).includes('protocolo') ? 'protocol' : 'manual',
  })
}

export function serializeClubPayload(payload) {
  const clean = { ...payload }
  delete clean.legacy
  return PAYLOAD_PREFIX + JSON.stringify(clean)
}

export function clubItem(doc, moduleKey) {
  return {
    ...doc,
    payload: parseClubPayload(doc, moduleKey),
    moduleKey,
  }
}

export function isArchived(item) {
  return Boolean(item?.payload?.archived_at)
}

export function canSeeClubItem(item, employee) {
  if (!item || !employee) return false
  if (employee.role === 'admin') return true

  if (item.moduleKey === 'credentials') {
    return employee.role === 'coach' && (item.visible_roles || []).includes('coach')
  }

  const roles = item.visible_roles || []
  return roles.length === 0 || roles.includes(employee.role)
}

export function moduleVisibleToRole(moduleKey, role) {
  if (moduleKey === 'credentials') return role === 'admin' || role === 'coach'
  return true
}

export function audienceRoles(visibleRoles = []) {
  if (visibleRoles.length === 0) return ['admin', 'coach', 'cleaning', 'maintenance']
  return [...new Set(['admin', ...visibleRoles])]
}

export function visibilityLabelForItem(item) {
  if (item.moduleKey === 'credentials') {
    return (item.visible_roles || []).includes('coach') ? 'Admins y coaches' : 'Solo admins'
  }
  const roles = item.visible_roles || []
  if (roles.length === 0) return 'Todo el equipo'
  const labels = {
    coach: 'coaches',
    cleaning: 'limpieza',
    maintenance: 'mantenimiento',
  }
  return ['admins', ...roles.map((role) => labels[role] || role)].join(' y ')
}

export function searchableText(item) {
  const payload = item?.payload || {}
  const values = [item?.title]

  switch (item?.moduleKey) {
    case 'contacts':
      values.push(payload.service, payload.name, payload.company, payload.phone, payload.notes)
      break
    case 'credentials':
      // Los secretos no se indexan ni aparecen en resultados de búsqueda.
      values.push(payload.service, payload.username, payload.url)
      break
    case 'meetings':
      values.push(payload.meeting_date, payload.notes)
      break
    default:
      values.push(payload.type, payload.summary, payload.content, payload.change_note)
  }

  return normalize(values.filter(Boolean).join(' '))
}

export function matchesClubQuery(item, query) {
  const normalizedQuery = normalize(query)
  return !normalizedQuery || searchableText(item).includes(normalizedQuery)
}

export function sortedClubItems(items, moduleKey) {
  const copy = [...items]
  if (moduleKey === 'meetings') {
    return copy.sort((a, b) =>
      (b.payload.meeting_date || b.created_at || '').localeCompare(
        a.payload.meeting_date || a.created_at || '',
      ))
  }
  if (moduleKey === 'contacts') {
    return copy.sort((a, b) => {
      if (Boolean(a.payload.priority) !== Boolean(b.payload.priority)) {
        return a.payload.priority ? -1 : 1
      }
      return (a.payload.service || a.title || '').localeCompare(
        b.payload.service || b.title || '',
        'es',
      )
    })
  }
  return copy.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
}

export function articleSummary(content, maxLength = 150) {
  return (content || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}
