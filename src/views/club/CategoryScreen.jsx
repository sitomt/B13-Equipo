import { useMemo, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { Card, EmptyState, ConfirmSheet } from '../../components/ui'
import { Button } from '../../components/controls'
import { deleteUtilityCategory, deleteUtilityDoc } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import { canSeeDoc, visibilityLabel } from './utilityMeta'
import UtilityArticleOverlay from './UtilityArticleOverlay'
import DocEditorScreen from './DocEditorScreen'
import CategorySheet from './CategorySheet'
import { Chevron, Pencil, Plus, Trash, Book } from '../../components/icons'

function snippet(body) {
  return (body || '').replace(/\n+/g, ' ').trim().slice(0, 80)
}

// Pantalla de una categoría: lista limpia de sus documentos visibles → artículo.
// El admin dispone de modo edición (crear/editar/borrar docs) y de renombrar/
// borrar la propia categoría.
export default function CategoryScreen({ category, docs, employee, onClose, onReload }) {
  const toast = useToast()
  const isAdmin = employee?.role === 'admin'
  const [editing, setEditing] = useState(false)
  const [reading, setReading] = useState(null)   // doc en lectura (artículo)
  const [editorDoc, setEditorDoc] = useState(null) // {} = nuevo, {..} = editar
  const [catSheet, setCatSheet] = useState(false)
  const [confirmDoc, setConfirmDoc] = useState(null)
  const [confirmCat, setConfirmCat] = useState(false)

  const visible = useMemo(
    () => docs.filter((d) => canSeeDoc(d, employee)),
    [docs, employee],
  )
  const nextPosition = docs.length

  async function removeDoc(doc) {
    try {
      await deleteUtilityDoc(doc.id)
      toast('Documento borrado')
      onReload?.()
    } catch (e) { console.error(e); toast('No se pudo borrar', 'error') }
  }

  async function removeCategory() {
    try {
      await deleteUtilityCategory(category.id)
      toast('Categoría borrada')
      onReload?.()
      onClose()
    } catch (e) { console.error(e); toast('No se pudo borrar la categoría', 'error') }
  }

  return (
    <>
      <OverlayScreen title={category.name} onClose={onClose}>
        {isAdmin && (
          <div className="mb-3 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Pencil}
              onClick={() => { haptic('tap'); setCatSheet(true) }}
            >
              Categoría
            </Button>
            <Button
              variant={editing ? 'ink' : 'secondary'}
              size="sm"
              icon={Pencil}
              onClick={() => { haptic('tap'); setEditing((v) => !v) }}
            >
              {editing ? 'Listo' : 'Editar'}
            </Button>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon={Book} title="Sin documentos" subtitle={isAdmin ? 'Añade el primero con el botón de abajo.' : 'Aún no hay documentos en esta categoría.'} />
        ) : (
          <Card className="divide-y divide-ink/[0.06] overflow-hidden">
            {visible.map((d) => {
              const restricted = (d.visible_roles || []).length > 0
              return (
                <div key={d.id} className="flex items-center gap-2 pr-2">
                  <button
                    onClick={() => { haptic('tap'); setReading(d) }}
                    className="flex min-h-[56px] flex-1 items-center gap-3 py-3 pl-4 text-left transition active:bg-ink/[0.03]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{d.title}</span>
                      {snippet(d.body) && (
                        <span className="block truncate text-xs text-ink/40">{snippet(d.body)}</span>
                      )}
                      {isAdmin && restricted && (
                        <span className="mt-0.5 block text-[11px] font-semibold text-bronze-dark">{visibilityLabel(d.visible_roles)}</span>
                      )}
                    </span>
                    {!editing && <Chevron size={18} className="shrink-0 text-ink/25" />}
                  </button>
                  {editing && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => { haptic('tap'); setEditorDoc(d) }}
                        aria-label="Editar"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink/60 active:scale-90"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        onClick={() => { haptic('tap'); setConfirmDoc(d) }}
                        aria-label="Borrar"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta active:scale-90"
                      >
                        <Trash size={17} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        )}

        {editing && (
          <div className="mt-4 space-y-3">
            <Button full icon={Plus} onClick={() => { haptic('tap'); setEditorDoc({}) }}>
              Nuevo documento
            </Button>
            <Button
              full
              variant="secondary"
              icon={Trash}
              onClick={() => { haptic('tap'); setConfirmCat(true) }}
              className="!text-terracotta"
            >
              Borrar categoría
            </Button>
          </div>
        )}
      </OverlayScreen>

      {reading && <UtilityArticleOverlay doc={reading} categoryName={category.name} employee={employee} onClose={() => setReading(null)} onReload={onReload} />}

      {editorDoc && (
        <DocEditorScreen
          doc={editorDoc.id ? editorDoc : null}
          categoryId={category.id}
          position={nextPosition}
          onClose={() => setEditorDoc(null)}
          onSaved={onReload}
        />
      )}

      <CategorySheet
        open={catSheet}
        category={category}
        onClose={() => setCatSheet(false)}
        onSaved={onReload}
      />

      <ConfirmSheet
        open={!!confirmDoc}
        onClose={() => setConfirmDoc(null)}
        onConfirm={() => removeDoc(confirmDoc)}
        title="Borrar documento"
        message={confirmDoc ? `Se eliminará "${confirmDoc.title}". No se puede deshacer.` : ''}
        confirmLabel="Borrar"
        tone="danger"
      />

      <ConfirmSheet
        open={confirmCat}
        onClose={() => setConfirmCat(false)}
        onConfirm={removeCategory}
        title="Borrar categoría"
        message={`Se eliminará "${category.name}" y todos sus documentos. No se puede deshacer.`}
        confirmLabel="Borrar todo"
        tone="danger"
      />
    </>
  )
}
