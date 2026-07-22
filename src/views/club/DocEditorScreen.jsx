import { useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { Button, Chip } from '../../components/controls'
import { createUtilityDoc, updateUtilityDoc } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { ROLE_OPTIONS } from './utilityMeta'
import { Check } from '../../components/icons'

// Editor de un documento a pantalla completa (mejor que un sheet por el body
// largo). Sirve para crear (doc sin id) y editar. Guarda y refresca la lista.
export default function DocEditorScreen({ doc, categoryId, position = 99, onClose, onSaved }) {
  const toast = useToast()
  const isNew = !doc?.id
  const [title, setTitle] = useState(doc?.title || '')
  const [body, setBody] = useState(doc?.body || '')
  const [roles, setRoles] = useState(doc?.visible_roles || [])
  const [busy, setBusy] = useState(false)

  const everyone = roles.length === 0

  function toggleRole(r) {
    haptic('tap')
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))
  }

  async function save() {
    const t = title.trim()
    if (!t) { toast('Ponle un título al documento', 'error'); return }
    setBusy(true)
    try {
      if (isNew) {
        await createUtilityDoc({ category_id: categoryId, title: t, body, visible_roles: roles, position })
      } else {
        await updateUtilityDoc(doc.id, { title: t, body, visible_roles: roles })
      }
      toast(isNew ? 'Documento creado' : 'Cambios guardados')
      onSaved?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  return (
    <OverlayScreen
      title={isNew ? 'Nuevo documento' : 'Editar documento'}
      onClose={onClose}
      footer={<Button full loading={busy} onClick={save}>Guardar</Button>}
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Protocolo de apertura"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-bronze"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Contenido</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Escribe el contenido del documento…"
            className="w-full resize-y rounded-2xl border border-ink/10 bg-white px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-bronze"
          />
        </label>

        <div>
          <span className="mb-2 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">¿Quién lo ve?</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={everyone} icon={everyone ? Check : undefined} onClick={() => setRoles([])}>
              Todo el equipo
            </Chip>
            {ROLE_OPTIONS.map((r) => (
              <Chip key={r.key} selected={roles.includes(r.key)} onClick={() => toggleRole(r.key)}>
                {r.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-ink/45">
            {everyone ? 'Visible para todo el equipo.' : 'Solo lo verán los roles seleccionados (y siempre dirección).'}
          </p>
        </div>
      </div>
    </OverlayScreen>
  )
}
