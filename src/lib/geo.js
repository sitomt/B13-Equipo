// Geolocalización para el fichaje con geocerca.
// Se usa SOLO en eventos de fichaje y mientras hay turno abierto (no rastrea
// posición fuera de turno). Privacidad por diseño.

// Distancia en metros entre dos coordenadas (Haversine).
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000 // radio terrestre en metros
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// ¿A este empleado se le aplica la geocerca? El admin (responsable/dueño)
// nunca: ficha y ve la info del gym desde cualquier sitio. Sesiones antiguas
// sin el flag se tratan como geofenced por defecto (salvo admin).
export function isGeofenced(employee) {
  if (!employee || employee.role === 'admin') return false
  return employee.geofenced ?? true
}

export function geoSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

// Lee la posición actual. Resuelve {lat, lng, accuracy} o rechaza con un Error
// cuyo .code es 'unsupported' | 'denied' | 'unavailable' | 'timeout'.
export function getPosition({ timeout = 10000, maximumAge = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (!geoSupported()) {
      const e = new Error('Geolocalización no soportada'); e.code = 'unsupported'; return reject(e)
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const e = new Error(err.message)
        e.code = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'
        reject(e)
      },
      { enableHighAccuracy: true, timeout, maximumAge }
    )
  })
}

// ¿Está la geocerca configurada (tiene coordenadas)? Si no, no se aplica a nadie.
export function fenceActive(fence) {
  return !!(fence && fence.lat != null && fence.lng != null)
}

// Evalúa una posición contra la geocerca. Devuelve { distance, inside, near }.
// - inside: dentro del radio (puede fichar / app desbloqueada)
// - near:   dentro de radio+buffer (zona de histéresis: no cierra todavía)
export function evaluate(pos, fence) {
  const distance = haversine(pos.lat, pos.lng, fence.lat, fence.lng)
  return {
    distance,
    inside: distance <= fence.radius_m,
    near: distance <= fence.radius_m + (fence.buffer_m || 0),
  }
}

// Vigila la posición mientras hay turno abierto y avisa cuando el empleado se
// aleja de la geocerca de forma sostenida. No cierra por un pico de GPS: exige
// salir de radio+buffer durante `grace_seconds` seguidos.
// onWarn(distance) se llama al detectar alejamiento (primer aviso).
// onLeave(lastInsidePos) se llama cuando se confirma la salida (cerrar turno).
// Devuelve una función para detener la vigilancia.
export function watchAway(fence, { onWarn, onLeave, onUpdate } = {}) {
  if (!geoSupported() || !fenceActive(fence)) return () => {}
  let awaySince = null   // timestamp de la primera lectura fuera de radio+buffer
  let warned = false
  const graceMs = (fence.grace_seconds || 300) * 1000

  const id = navigator.geolocation.watchPosition(
    (p) => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
      const ev = evaluate(pos, fence)
      onUpdate?.({ ...ev, pos })
      if (ev.near) {
        // De vuelta dentro de la zona: se cancela cualquier cuenta atrás.
        awaySince = null; warned = false
        return
      }
      // Fuera de radio+buffer
      const now = Date.now()
      if (awaySince == null) awaySince = now
      if (!warned) { warned = true; onWarn?.(ev.distance) }
      if (now - awaySince >= graceMs) {
        onLeave?.(pos)
      }
    },
    () => { /* error puntual de GPS: ignorar, no cerrar por ello */ },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  )
  return () => navigator.geolocation.clearWatch(id)
}

// Mensaje legible para cada error de getPosition.
export function geoErrorMessage(code) {
  switch (code) {
    case 'denied': return 'Activa el permiso de ubicación para fichar'
    case 'timeout': return 'No se pudo obtener tu ubicación, inténtalo de nuevo'
    case 'unsupported': return 'Este dispositivo no permite ubicación'
    default: return 'No se pudo obtener tu ubicación'
  }
}
