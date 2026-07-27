import { createContext, useContext, useEffect, useState } from 'react'
import { getEmployee } from '../lib/api'

// Sesión SIMULADA: no hay login real todavía. Guardamos el empleado
// "activo" para poder entrar/salir de cada rol al instante. Se sustituirá
// por Supabase Auth + PIN más adelante.
const SessionCtx = createContext(null)
const STORAGE_KEY = 'b13.session.employee'

export function SessionProvider({ children }) {
  const [employee, setEmployee] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (employee) localStorage.setItem(STORAGE_KEY, JSON.stringify(employee))
    else localStorage.removeItem(STORAGE_KEY)
  }, [employee])

  // La sesión es local para permitir cambiar de perfil con rapidez. Al abrir la
  // app, se sincroniza el perfil por si dirección cambió su configuración.
  useEffect(() => {
    if (!employee?.id) return undefined
    let cancelled = false
    getEmployee(employee.id)
      .then((profile) => { if (profile && !cancelled) setEmployee(profile) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [employee?.id])

  const login = (emp) => setEmployee(emp)
  const logout = () => setEmployee(null)

  return (
    <SessionCtx.Provider value={{ employee, login, logout }}>
      {children}
    </SessionCtx.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider')
  return ctx
}
