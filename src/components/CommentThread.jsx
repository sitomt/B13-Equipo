import { useState } from 'react'
import { haptic } from '../lib/haptics'
import { relativeTime } from '../lib/date'
import { useToast } from './Toast'
import { Avatar } from './ui'
import { Send } from './icons'

const firstName = (name) => (name || '').split(' ')[0]

// Una línea de conversación: avatar 20px + nombre de pila + texto + hora.
function CommentRow({ c, empById }) {
  const emp = empById?.get(c.employee_id) || { name: c.employee_name }
  return (
    <div className={`flex items-start gap-2 ${c._pending ? 'opacity-60' : ''}`}>
      <Avatar emp={emp} size={20} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm leading-snug text-ink/70 line-clamp-2">
        <span className="font-bold text-ink/80">{firstName(c.employee_name)}</span> {c.body}
      </p>
      <span className="shrink-0 pt-0.5 text-xs text-ink/35">{relativeTime(c.created_at)}</span>
    </div>
  )
}

// ============================================================================
// Conversación bajo un aviso, MINIMALISTA: colapsada muestra solo el último
// comentario; "Ver N anteriores" despliega el resto. Input fino permanente
// (salvo readOnly) con envío optimista (patrón TaskRow: pinta al instante,
// revierte y avisa si la API falla). `tone`: sobre card blanca el input va
// sand; sobre nota sand (fromPeer) va blanco.
// ============================================================================
export default function CommentThread({ comments = [], employee, empById, onSend, readOnly = false, tone = 'white' }) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState([]) // comentarios optimistas en vuelo
  const toast = useToast()

  const all = [...comments, ...pending]
  if (readOnly && all.length === 0) return null

  const visible = expanded ? all : all.slice(-1)
  const hiddenCount = all.length - 1

  async function send(e) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !onSend) return
    const temp = {
      id: `tmp-${Date.now()}`,
      _pending: true,
      employee_id: employee.id,
      employee_name: employee.name,
      employee_role: employee.role,
      body,
      created_at: new Date().toISOString(),
    }
    setDraft('')
    setPending((p) => [...p, temp])
    haptic('success')
    try {
      await onSend(body)
    } catch {
      toast('No se pudo enviar', 'error') // revertir: el comentario desaparece
    } finally {
      setPending((p) => p.filter((c) => c.id !== temp.id))
    }
  }

  const inputBg = tone === 'sand' ? 'bg-white' : 'bg-sand-50'

  return (
    <div className="border-t border-ink/[0.06] px-4 py-3">
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => { haptic('tap'); setExpanded(true) }}
          className="-mt-1 flex min-h-[44px] items-center text-xs font-semibold text-bronze-dark active:opacity-70"
        >
          Ver {hiddenCount} {hiddenCount === 1 ? 'anterior' : 'anteriores'}
        </button>
      )}
      {all.length > 0 && (
        <div className={`space-y-2 ${expanded ? 'animate-rise-in' : ''}`}>
          {visible.map((c) => <CommentRow key={c.id} c={c} empById={empById} />)}
        </div>
      )}
      {!readOnly && (
        <form onSubmit={send} className={`flex items-center gap-2 ${all.length > 0 ? 'mt-2.5' : ''}`}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Responder…"
            className={`min-h-[40px] min-w-0 flex-1 rounded-full ${inputBg} px-4 text-sm text-ink placeholder:text-ink/35 outline-none border border-ink/[0.06] focus:border-ink/15`}
          />
          {draft.trim() && (
            <button
              type="submit"
              aria-label="Enviar comentario"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white active:scale-95"
            >
              <Send size={17} />
            </button>
          )}
        </form>
      )}
    </div>
  )
}
