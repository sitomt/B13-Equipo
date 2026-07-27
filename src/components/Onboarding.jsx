import { useState } from 'react'
import { useSession } from '../state/session'
import { isGeofenced } from '../lib/geo'
import { haptic } from '../lib/haptics'
import { Wordmark } from './Logo'
import {
  Activity, Dumbbell, Calendar, Alert, Wrench, Spray, Megaphone, Chat,
  Plus, MapPin, Power, Clock, Check, BarChart, Settings, User, Bell,
} from './icons'

const DONE_KEY = (id) => `b13.onboarding.done.${id}`

// ¿Hay que mostrar el onboarding a este usuario? (primera vez en su dispositivo)
export function onboardingPending(employee) {
  if (!employee) return false
  try { return localStorage.getItem(DONE_KEY(employee.id)) !== '1' } catch { return false }
}

// Una "acción del +" para las tarjetas que explican el botón flotante.
function PlusAction({ icon: Icon, label, tone = 'bronze' }) {
  const tones = {
    bronze: 'bg-bronze/20 text-bronze-glow',
    ink: 'bg-white/10 text-white/80',
    terracotta: 'bg-terracotta/25 text-[#e8a48c]',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/[0.07]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}><Icon size={18} /></span>
      <span className="text-sm font-semibold text-white/85">{label}</span>
    </div>
  )
}

// Pasos del tutorial según el rol. Cada uno: { icon, title, body }.
function stepsFor(employee) {
  const geo = isGeofenced(employee)
  const tracksTime = employee.requires_time_tracking !== false
  const fichajeStep = {
    icon: geo ? MapPin : Power,
    title: 'Ficha tu jornada',
    body: geo
      ? 'Arriba del todo tienes tu fichaje. Solo funciona cuando estás dentro del gimnasio: al llegar pulsa "Fichar entrada". Si te alejas, tu jornada se cierra sola.'
      : 'Arriba del todo tienes tu fichaje. Pulsa "Fichar entrada" al empezar y "Salir" al terminar. Puedes marcar pausa y comida.',
  }

  if (employee.role === 'coach') {
    return [
      { icon: Dumbbell, title: `Hola, ${employee.name.split(' ')[0]}`, body: 'Esta es tu app de Baktun 13. En 30 segundos te enseño lo básico para que la uses sin perderte.' },
      ...(tracksTime ? [fichajeStep] : []),
      { icon: Activity, title: 'Pestaña "Hoy"', body: 'Tu día de un vistazo: apertura, tareas y cierre. Marca cada tarea con un toque; con "Marcar todo" cierras una sección entera de golpe.' },
      { icon: Dumbbell, title: 'Pestaña "El gym"', body: 'El estado del club: incidencias abiertas (puedes resolverlas), qué está arreglando mantenimiento y cómo va la limpieza de hoy.' },
      { icon: Calendar, title: 'Pestaña "Horarios"', body: 'Tu cuadrante de la semana y tus horas trabajadas.' },
      {
        icon: Plus, title: 'El botón +', body: (
          <div className="space-y-2">
            <p className="text-sm text-white/65">Abajo a la derecha. Toca para reportar o comunicar:</p>
            <PlusAction icon={Alert} label="Reportar incidencia" tone="ink" />
            <PlusAction icon={Wrench} label="Algo roto · Mantenimiento" tone="terracotta" />
            <PlusAction icon={Spray} label="Algo sucio · Limpieza" tone="bronze" />
            <PlusAction icon={Megaphone} label="Aviso al equipo" tone="ink" />
          </div>
        ),
      },
    ]
  }

  if (employee.role === 'cleaning') {
    return [
      { icon: Spray, title: `Hola, ${employee.name.split(' ')[0]}`, body: 'Bienvenida a la app de Baktun 13. Te enseño lo básico para tu ruta.' },
      ...(tracksTime ? [fichajeStep] : []),
      { icon: Activity, title: 'Pestaña "Ruta"', body: 'Tus tareas de limpieza de hoy. Márcalas con un toque. Si dirección manda un aviso urgente, aparecerá en rojo arriba del todo.' },
      { icon: BarChart, title: 'Pestaña "Estadísticas"', body: 'Tu resumen: tareas hechas, avisos atendidos y horas, por día/semana/mes.' },
      { icon: Megaphone, title: 'Cabecera', body: 'Arriba tienes "Aviso" para avisar a los coaches, "Horarios" para ver tu cuadrante y "Utilidades" con los manuales.' },
    ]
  }

  if (employee.role === 'maintenance') {
    return [
      { icon: Wrench, title: `Hola, ${employee.name.split(' ')[0]}`, body: 'Bienvenido a la app de Baktun 13. Aquí gestionas los partes de mantenimiento.' },
      ...(tracksTime ? [fichajeStep] : []),
      { icon: Alert, title: 'Tus partes', body: 'Arriba ves cuántos hay Pendientes, En curso y Resueltos. Filtra por área y busca en el histórico.' },
      {
        icon: Clock, title: 'Cómo trabajar un parte', body: (
          <div className="space-y-2">
            <PlusAction icon={Clock} label="Empezar — lo pones en curso" tone="bronze" />
            <PlusAction icon={Check} label="Resolver — con nota de qué hiciste" tone="bronze" />
            <p className="text-sm text-white/65">Si no puedes acabarlo, usa "Nota" para explicar por qué (lo verá dirección).</p>
          </div>
        ),
      },
      {
        icon: Plus, title: 'El botón +', body: (
          <div className="space-y-2">
            <PlusAction icon={Wrench} label="Añadir tarea de mantenimiento" tone="bronze" />
            <PlusAction icon={Megaphone} label="Mandar aviso" tone="ink" />
          </div>
        ),
      },
    ]
  }

  // admin
  return [
    { icon: Settings, title: `Hola, ${employee.name.split(' ')[0]}`, body: 'Bienvenido al panel de Baktun 13. Lo ves todo y lo controlas todo desde aquí.' },
    ...(tracksTime ? [fichajeStep] : []),
    { icon: Activity, title: 'Resumen', body: 'Quién está fichado ahora, progreso de tareas del equipo e incidencias abiertas. Cambia a "Histórico" para las estadísticas.' },
    { icon: Calendar, title: 'Horarios e Incidencias', body: 'Crea y publica el cuadrante de turnos, y gestiona las incidencias internas y los partes de mantenimiento.' },
    { icon: User, title: 'Equipo y Plantillas', body: 'Da de alta personas y decide quién ficha por geocerca. En Plantillas editas la agenda diaria y el mantenimiento preventivo.' },
    {
      icon: Plus, title: 'El botón +', body: (
        <div className="space-y-2">
          <p className="text-sm text-white/65">Para comunicar y delegar al instante:</p>
          <PlusAction icon={Megaphone} label="Aviso al equipo" tone="ink" />
          <PlusAction icon={Spray} label="Tarea urgente · Limpieza" tone="bronze" />
          <PlusAction icon={Wrench} label="Algo roto · Mantenimiento" tone="terracotta" />
          <PlusAction icon={Alert} label="Incidencia interna" tone="ink" />
        </div>
      ),
    },
    { icon: MapPin, title: 'Activa la geocerca', body: 'En Equipo → "Geocerca del gimnasio", colócate en el club y pulsa "Usar mi ubicación actual". Hasta entonces nadie queda bloqueado al fichar.' },
  ]
}

export default function Onboarding({ onClose }) {
  const { employee } = useSession()
  const [i, setI] = useState(0)
  const steps = stepsFor(employee)
  const step = steps[i]
  const last = i === steps.length - 1
  const Icon = step.icon

  function finish() {
    try { localStorage.setItem(DONE_KEY(employee.id), '1') } catch { /* modo privado */ }
    onClose()
  }
  function next() { haptic('tap'); if (last) finish(); else setI((v) => v + 1) }

  return (
    <div className="scene-dark fixed inset-0 z-[60] flex flex-col text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-safe">
        <div className="flex items-center justify-between pt-6">
          <Wordmark variant="white" className="h-5 w-auto" />
          {!last && (
            <button onClick={finish} className="text-sm font-semibold text-white/45 active:text-white/80">Saltar</button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="brand-glow mb-7 flex h-20 w-20 items-center justify-center rounded-3xl bg-bronze/15 text-bronze-glow ring-1 ring-bronze/25">
            <Icon size={38} />
          </div>
          <h2 className="font-display text-3xl font-extrabold leading-tight">{step.title}</h2>
          <div className="mt-3 text-base leading-relaxed text-white/65">
            {typeof step.body === 'string' ? <p>{step.body}</p> : step.body}
          </div>
        </div>

        {/* Puntos de progreso */}
        <div className="mb-6 flex justify-center gap-2">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-bronze-glow' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-lg font-extrabold text-ink transition-enter active:scale-[0.98]"
        >
          {last ? '¡Empezar!' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}
