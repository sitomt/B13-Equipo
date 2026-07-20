import { useState } from 'react'
import Sheet from './Sheet'
import { createFeedback } from '../lib/api'
import { useToast } from './Toast'
import { Chat } from './icons'

const TYPES = [
  { key: 'cliente', label: 'De un cliente', desc: 'Algo que te ha transmitido un cliente: una queja, una idea, algo que le ha gustado…' },
  { key: 'sugerencia', label: 'Sugerencia a dirección', desc: 'Una propuesta o mejora tuya para la dirección del centro.' },
  { key: 'app', label: 'Sobre la app', desc: '¿Algo confuso o mejorable de la aplicación? Esto ayuda a mejorarla.' },
]

// Hoja para que un coach mande feedback (cliente / sugerencia a dirección / app).
export default function FeedbackSheet({ open, onClose, employee, onCreated }) {
  const [type, setType] = useState('cliente')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const desc = TYPES.find((t) => t.key === type)?.desc

  function reset() { setType('cliente'); setMessage('') }

  async function submit() {
    if (!message.trim()) { toast('Escribe tu feedback', 'error'); return }
    setBusy(true)
    try {
      await createFeedback({
        type,
        message: message.trim(),
        status: 'new',
        created_by: employee.id,
        created_by_name: employee.name,
      })
      toast('Feedback enviado ✓')
      reset()
      onClose()
      onCreated?.()
    } catch {
      toast('No se pudo enviar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dar feedback">
      <p className="mb-4 text-sm text-ink/55">Cuéntanos lo que quieras. Le llega a la dirección del centro.</p>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Tipo</label>
      <div className="mb-2 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`inline-flex items-center min-h-[44px] rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              type === t.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-4 px-1 text-xs text-ink/45">{desc}</p>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/40">Tu feedback</label>
      <textarea
        autoFocus
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Escribe aquí…"
        className="mb-5 field"
      />

      <button
        onClick={submit}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 btn-primary"
      >
        <Chat size={20} /> Enviar feedback
      </button>
    </Sheet>
  )
}
