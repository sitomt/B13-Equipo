import { useEffect, useState } from 'react'
import { useSession } from './state/session'
import RoleSwitcher from './views/RoleSwitcher'
import CoachView from './views/CoachView'
import CleaningView from './views/CleaningView'
import MaintenanceView from './views/MaintenanceView'
import AdminView from './views/admin/AdminView'
import { BirthdayOverlay } from './components/Birthday'
import OfflineBanner from './components/OfflineBanner'
import Onboarding, { onboardingPending } from './components/Onboarding'
import { startOfflineSync } from './lib/offline'

export default function App() {
  const { employee } = useSession()
  const [onboard, setOnboard] = useState(false)

  // Arranca la sincronización de la cola offline al cargar la app.
  useEffect(() => { startOfflineSync() }, [])

  // Tutorial la primera vez de cada usuario (tras crear PIN y entrar).
  useEffect(() => { setOnboard(onboardingPending(employee)) }, [employee])

  // Permite reabrirlo desde "Ver tutorial" en la cuenta.
  useEffect(() => {
    const h = () => setOnboard(true)
    window.addEventListener('b13:onboarding', h)
    return () => window.removeEventListener('b13:onboarding', h)
  }, [])

  if (!employee) return (
    <>
      <OfflineBanner />
      <RoleSwitcher />
    </>
  )

  const view = (() => {
    switch (employee.role) {
      case 'coach': return <CoachView />
      case 'cleaning': return <CleaningView />
      case 'maintenance': return <MaintenanceView />
      case 'admin': return <AdminView />
      default: return <RoleSwitcher />
    }
  })()

  return (
    <>
      <OfflineBanner />
      {view}
      <BirthdayOverlay />
      {onboard && <Onboarding onClose={() => setOnboard(false)} />}
    </>
  )
}
