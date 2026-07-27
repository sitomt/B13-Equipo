import { Megaphone, Chevron } from './icons'
import { haptic } from '../lib/haptics'

// Banner compacto de atención: solo existe si hay avisos sin leer para esta
// persona. Al abrir Avisos se marcan como leídos y desaparece de Resumen.
export default function AlertsBanner({ anns = [], onOpen }) {
  if (!anns.length) return null
  const urgent = anns.filter((a) => a.priority === 'high').length
  const totalLabel = `${anns.length} aviso${anns.length > 1 ? 's' : ''} nuevo${anns.length > 1 ? 's' : ''}`
  const label = urgent > 0
    ? `${totalLabel} · ${urgent} prioritario${urgent > 1 ? 's' : ''}`
    : totalLabel
  return (
    <button
      onClick={() => { haptic('tap'); onOpen() }}
      aria-label={`${label}. Abrir avisos`}
      className={`flex min-h-[54px] w-full items-center gap-3 rounded-xl2 px-4 text-left shadow-card transition-enter active:scale-[0.98] ${
        urgent > 0 ? 'bg-bronze text-white' : 'card-line bg-white'
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgent > 0 ? 'bg-white/20' : 'bg-bronze/12 text-bronze-dark'}`}>
        <Megaphone size={17} />
      </span>
      <span className={`min-w-0 flex-1 text-sm font-bold leading-tight ${urgent > 0 ? 'text-white' : 'text-ink'}`}>{label}</span>
      <span className={`text-xs font-semibold ${urgent > 0 ? 'text-white/80' : 'text-bronze-dark'}`}>Ver</span>
      <Chevron size={16} className={urgent > 0 ? 'text-white/70' : 'text-ink/30'} />
    </button>
  )
}
