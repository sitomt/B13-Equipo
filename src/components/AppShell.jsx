import { useState } from 'react'
import { Wordmark } from './Logo'
import { useSession } from '../state/session'
import { greetingMadrid, longDateMadrid } from '../lib/date'
import AccountSheet from './AccountSheet'
import { Avatar } from './ui'

const ROLE_LABEL = {
  admin: 'Administración',
  coach: 'Coach',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
}

// Cabecera oscura con logo de marca. Jerarquía simple: el saludo y la fecha
// SOLO aparecen en la primera pestaña de cada rol (`primary`); el resto de
// pantallas llevan solo el título de sección. Todo lo personal (utilidades,
// equipo, cerrar sesión…) vive en el Perfil, detrás del avatar.
export function Header({ subtitle, primary = false }) {
  const { employee } = useSession()
  const [account, setAccount] = useState(false)
  return (
    <header
      className={`relative overflow-hidden rounded-b-xl3 px-5 pt-safe text-white shadow-pop ${primary ? 'pb-6' : 'pb-5'}`}
      style={{ backgroundImage: 'linear-gradient(168deg, #3A352F 0%, #2C2925 52%, #262320 100%)' }}
    >
      <div className="brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="texture-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      {/* línea de horizonte bronce: el filo de luz bajo la cabecera */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bronze/45 to-transparent" aria-hidden="true" />
      <div className="relative flex items-center justify-between pt-4">
        <Wordmark variant="white" className="h-5 w-auto" />
        <button
          onClick={() => setAccount(true)}
          aria-label="Mi perfil y ajustes"
          className="-m-1 flex h-11 w-11 items-center justify-center rounded-full transition-enter active:scale-95"
        >
          <Avatar emp={employee} size={38} className="ring-2 ring-white/15" />
        </button>
      </div>
      <AccountSheet open={account} onClose={() => setAccount(false)} employee={employee} />
      <div className={`relative ${primary ? 'mt-4' : 'mt-2'}`}>
        {primary && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {greetingMadrid()}, {employee.name.split(' ')[0]}
          </p>
        )}
        <h1 className={`mt-0.5 font-display font-extrabold tracking-tight ${primary ? 'text-screen' : 'text-3xl leading-tight'}`}>
          {subtitle || ROLE_LABEL[employee.role]}
        </h1>
        {primary && (
          /* La fecha es información, no un estado: texto plano, sin tag */
          <p className="mt-1.5 text-sm font-semibold capitalize text-bronze-glow/85">{longDateMadrid()}</p>
        )}
      </div>
    </header>
  )
}

export function Screen({ children }) {
  return <div className="min-h-dvh bg-sand pb-28">{children}</div>
}
