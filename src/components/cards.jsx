import { useEffect, useState } from 'react'
import { completeTask, undoCompletion, completeAdHoc, markAnnouncementRead } from '../lib/api'
import { timeHM } from '../lib/date'
import { haptic } from '../lib/haptics'
import { useToast } from './Toast'
import { useSession } from '../state/session'
import { Check, Clock, Refresh, Megaphone, Spray, User, Lock } from './icons'

// Fila de tarea: única (checkbox) o recurrente (contador + "otra pasada").
export function TaskRow({ item, employee, onChange }) {
  const [busy, setBusy] = useState(false)
  // Estado optimista: pinta el resultado al instante y se revierte si la API falla
  // (skill §3 input-latency / tap-feedback-speed). null = usar la verdad del servidor.
  const [optimistic, setOptimistic] = useState(null)
  const toast = useToast()

  // Cuando llega el dato real del refetch, soltamos el estado optimista.
  useEffect(() => { setOptimistic(null) }, [item.done, item.completionId])

  const shownDone = optimistic ?? item.done

  // Solo el autor puede desmarcar lo que él marcó como hecho.
  const ownedByOther = item.done && item.lastById && item.lastById !== employee.id

  async function toggleOnce() {
    if (busy) return
    if (ownedByOther) {
      toast(`Solo ${item.lastBy} puede desmarcarla`, 'error')
      return
    }
    const completing = !shownDone
    haptic('tap')
    setOptimistic(completing) // feedback inmediato
    setBusy(true)
    try {
      if (!completing) {
        await undoCompletion(item.completionId)
      } else {
        const row = await completeTask(item, employee)
        // Si se guardó en la cola offline no hay id todavía → sin "Deshacer".
        if (row?._queued) {
          toast('Guardado · se enviará al recuperar conexión', 'success')
        } else {
          toast('Hecho ✓', 'success', {
            label: 'Deshacer',
            onClick: async () => {
              try { await undoCompletion(row.id); await onChange?.() } catch { /* ya no existe */ }
            },
          })
        }
      }
      await onChange?.()
    } catch {
      setOptimistic(null) // revertir
      toast('No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addPass() {
    if (busy) return
    haptic('tap')
    setBusy(true)
    try {
      await completeTask(item, employee)
      toast(`Registrado · ${item.count + 1}ª pasada`)
      await onChange?.()
    } catch {
      toast('No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (item.recurring) {
    // ¿Toca ya? Intervalo extraído de "cada N min" frente al tiempo desde la última pasada.
    const interval = parseInt((item.recurrence_label || '').match(/(\d+)/)?.[1] || '0', 10)
    const sinceMin = item.lastAt ? (Date.now() - new Date(item.lastAt).getTime()) / 60000 : Infinity
    const overdue = interval > 0 && sinceMin >= interval
    return (
      <div className={`flex items-center gap-3 px-3 py-3 ${overdue ? 'bg-ochre/[0.07]' : ''}`}>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${overdue ? 'bg-ochre/20 text-[#8a6a1e]' : 'bg-stone/12 text-stone'}`}>
          <Refresh size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-ink">{item.title}</p>
            {overdue && <span className="shrink-0 text-xs font-bold text-[#8a6a1e]">toca ya</span>}
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink/45">
            {item.recurrence_label || 'recurrente'}
            {item.count > 0 ? (
              <>
                <span className="text-ink/25">·</span>
                <span className="font-semibold text-sage">{item.count}× hoy</span>
                {item.lastAt && <span className="text-ink/40">última {timeHM(item.lastAt)}</span>}
              </>
            ) : (
              <><span className="text-ink/25">·</span><span className="text-ink/40">sin hacer aún</span></>
            )}
          </p>
        </div>
        <button
          onClick={addPass}
          disabled={busy}
          className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-sm font-bold text-white transition active:scale-90 disabled:opacity-50 ${overdue ? 'bg-ochre' : 'bg-ink'}`}
        >
          Pasada +
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={toggleOnce}
      disabled={busy}
      aria-pressed={shownDone}
      aria-label={`${item.title}${shownDone ? ', hecha' : ', marcar como hecha'}`}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-enter active:bg-ink/[0.03]"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-enter ${
          shownDone ? 'border-sage bg-sage text-white animate-pop' : 'border-ink/20 text-transparent'
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${shownDone ? 'text-ink/35 line-through' : 'text-ink'}`}>{item.title}</p>
        {shownDone ? (
          <p className="flex items-center gap-1 text-xs text-sage">
            <User size={12} /> {item.lastBy || employee.name} · {item.lastAt ? timeHM(item.lastAt) : 'ahora'}
          </p>
        ) : (
          item.scheduled_time && (
            <p className="flex items-center gap-1 text-xs text-ink/40">
              <Clock size={12} /> {item.scheduled_time.slice(0, 5)}
            </p>
          )
        )}
      </div>
      {/* La categoría es información, no estado: texto plano discreto */}
      {item.category && !shownDone && (
        <span className="shrink-0 text-xs font-semibold text-ink/40">{item.category}</span>
      )}
      {ownedByOther && <Lock size={16} className="text-ink/25" />}
    </button>
  )
}

// Aviso de comunicación interna
export function AnnouncementCard({ a }) {
  const high = a.priority === 'high'
  const { employee } = useSession()

  // Acuse de lectura: al mostrarse a un miembro del equipo (no admin), se marca
  // como leído para que dirección sepa quién lo ha visto.
  useEffect(() => {
    if (employee && employee.role !== 'admin' && a?.id) {
      markAnnouncementRead(a.id, employee.id).catch(() => {})
    }
  }, [a?.id, employee?.id, employee?.role])

  // Avisos de un coach: más discretos que los de dirección (nota de compañero).
  if (a.created_by_role && a.created_by_role !== 'admin') {
    return (
      <div className="rounded-xl2 border border-ink/[0.07] bg-sand-50 px-3.5 py-2.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/45">
            <Megaphone size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-ink/80">{a.title}</p>
            {a.body && <p className="mt-0.5 text-xs leading-snug text-ink/55">{a.body}</p>}
            {a.created_by_name && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink/40">
                <User size={11} /> {a.created_by_name}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl2 p-4 shadow-card ${
        high ? 'bg-bronze text-white' : 'border border-ink/8 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${high ? 'bg-white/20' : 'bg-bronze/12 text-bronze-dark'}`}>
          <Megaphone size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-display text-card font-bold leading-tight ${high ? 'text-white' : 'text-ink'}`}>{a.title}</p>
          </div>
          {a.body && <p className={`mt-0.5 text-sm leading-snug ${high ? 'text-white/85' : 'text-ink/60'}`}>{a.body}</p>}
        </div>
      </div>
    </div>
  )
}

// Tarea puntual / aviso urgente (limpieza). `flat` la renderiza sin estilos de
// card exterior (para usarla como fila dentro de un SectionCard).
export function AdHocCard({ task, employee, onChange, flat = false }) {
  const [busy, setBusy] = useState(false)
  const [optimisticDone, setOptimisticDone] = useState(false)
  const toast = useToast()
  const urgent = task.priority === 'urgent'
  const done = task.status === 'done' || optimisticDone

  async function markDone() {
    if (busy || done) return
    haptic('tap')
    setOptimisticDone(true)
    setBusy(true)
    try {
      await completeAdHoc(task.id, employee)
      toast('Tarea completada ✓')
      await onChange?.()
    } catch {
      setOptimisticDone(false)
      toast('No se pudo completar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`overflow-hidden ${flat ? '' : 'rounded-xl2 shadow-card'} ${
        done ? `opacity-60 ${flat ? '' : 'bg-white'}` : urgent ? 'bg-terracotta text-white' : flat ? '' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          done ? 'bg-sage/15 text-sage' : urgent ? 'bg-white/20 text-white' : 'bg-terracotta/12 text-terracotta'
        }`}>
          {done ? <Check size={20} /> : <Spray size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!done && urgent && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-[3px] text-xs font-bold text-white">URGENTE</span>
            )}
            {task.zone && <span className={`text-xs font-semibold ${urgent && !done ? 'text-white/80' : 'text-ink/45'}`}>{task.zone}</span>}
          </div>
          <p className={`mt-0.5 font-bold ${done ? 'text-ink/50 line-through' : urgent ? 'text-white' : 'text-ink'}`}>{task.title}</p>
          {task.description && (
            <p className={`mt-0.5 text-sm leading-snug ${urgent && !done ? 'text-white/80' : 'text-ink/55'}`}>{task.description}</p>
          )}
          {task.created_by_name && !done && (
            <p className={`mt-1 flex items-center gap-1 text-xs ${urgent ? 'text-white/75' : 'text-ink/45'}`}>
              <User size={12} /> Pedido por {task.created_by_name}
            </p>
          )}
          {done && task.done_by_name && (
            <p className="mt-1 text-xs text-sage">Hecho por {task.done_by_name} · {timeHM(task.done_at)}</p>
          )}
        </div>
      </div>
      {!done && (
        <button
          onClick={markDone}
          disabled={busy}
          className={`w-full py-3 text-sm font-extrabold transition active:scale-[0.98] ${
            urgent ? 'bg-white/15 text-white' : 'bg-ink text-white'
          }`}
        >
          Marcar como hecho
        </button>
      )}
    </div>
  )
}
