import { supabase } from './supabase'

// Cola offline: si una acción de campo (fichaje, completar tarea) falla por falta
// de cobertura (sótano, almacén), se guarda en localStorage y se reintenta sola
// al recuperar la conexión. Evita perder trabajo ya hecho.
const KEY = 'b13.offline.queue'
const listeners = new Set()

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function write(q) {
  try { localStorage.setItem(KEY, JSON.stringify(q)) } catch { /* modo privado */ }
  for (const fn of listeners) fn(q.length)
}

export function pendingCount() { return read().length }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function isOffline() { return typeof navigator !== 'undefined' && navigator.onLine === false }

// ¿El fallo parece de red (sin conexión) y no un error real del servidor?
export function isNetworkError(e) {
  if (isOffline()) return true
  const m = (e?.message || '').toLowerCase()
  return e?.name === 'TypeError' || m.includes('failed to fetch') ||
    m.includes('networkerror') || m.includes('load failed') || m.includes('fetch')
}

export function enqueue(table, row) {
  const q = read()
  const id = (globalThis.crypto?.randomUUID?.()) || `${Date.now()}-${Math.random()}`
  q.push({ id, table, row, at: Date.now() })
  write(q)
}

// Reproduce la cola contra Supabase. Idempotencia razonable: si un envío falla
// otra vez por red, se detiene y se reintenta más tarde; los errores "reales"
// (validación) se descartan para no atascar la cola.
let flushing = false
export async function flush() {
  if (flushing || isOffline()) return 0
  flushing = true
  let sent = 0
  try {
    let q = read()
    for (const item of [...q]) {
      try {
        const { error } = await supabase.from(item.table).insert(item.row)
        if (error) throw error
      } catch (e) {
        if (isNetworkError(e)) break // sigue sin red: reintentar luego
        // error real: lo descartamos para que la cola avance
      }
      q = read().filter((x) => x.id !== item.id)
      write(q)
      sent++
    }
  } finally { flushing = false }
  return sent
}

// Arranca el auto-flush: al cargar y cada vez que vuelve la conexión.
export function startOfflineSync() {
  if (typeof window === 'undefined') return
  const tryFlush = () => flush().catch(() => {})
  window.addEventListener('online', tryFlush)
  tryFlush()
}
