import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Button } from '../../components/controls'
import { createUtilityCategory, updateUtilityCategory } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { CATEGORY_ICONS, ICON_OPTIONS } from './utilityMeta'

// Sheet para crear (category=null) o renombrar/reiconar una categoría del Club.
// El borrado se gestiona fuera (ConfirmSheet en CategoryScreen).
export default function CategorySheet({ open, category = null, position = 99, onClose, onSaved }) {
  const toast = useToast()
  const isNew = !category
  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || 'Book')
  const [busy, setBusy] = useState(false)

  // Rehidrata al abrir con otra categoría.
  const key = category?.id || 'new'

  async function save() {
    const n = name.trim()
    if (!n) { toast('Ponle un nombre a la categoría', 'error'); return }
    setBusy(true)
    try {
      if (isNew) await createUtilityCategory({ name: n, icon, position })
      else await updateUtilityCategory(category.id, { name: n, icon })
      toast(isNew ? 'Categoría creada' : 'Categoría actualizada')
      onSaved?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  return (
    <Sheet key={key} open={open} onClose={onClose} title={isNew ? 'Nueva categoría' : 'Editar categoría'}>
      <div className="space-y-5 pb-2">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Nombre</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Manuales y protocolos"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-bronze"
          />
        </label>

        <div>
          <span className="mb-2 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Icono</span>
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map((opt) => {
              const Icon = CATEGORY_ICONS[opt]
              const on = icon === opt
              return (
                <button
                  key={opt}
                  onClick={() => { haptic('tap'); setIcon(opt) }}
                  aria-pressed={on}
                  className={`flex h-14 items-center justify-center rounded-2xl transition active:scale-95 ${
                    on ? 'bg-bronze/12 text-bronze-dark ring-2 ring-bronze' : 'bg-ink/[0.05] text-ink/50'
                  }`}
                >
                  <Icon size={22} />
                </button>
              )
            })}
          </div>
        </div>

        <Button full loading={busy} onClick={save}>Guardar</Button>
      </div>
    </Sheet>
  )
}
