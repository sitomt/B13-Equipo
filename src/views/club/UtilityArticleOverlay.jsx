import { useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { Card } from '../../components/ui'
import { Button } from '../../components/controls'
import { haptic } from '../../lib/haptics'
import { visibilityLabel } from './utilityMeta'
import DocEditorScreen from './DocEditorScreen'
import { Pencil } from '../../components/icons'

// Artículo de un documento del Club a pantalla completa. Recibe un doc de BD
// ({title, body, visible_roles, category_id...}). `categoryName` es el contexto
// que se muestra como texto plano. El admin puede abrir el editor desde aquí.
export default function UtilityArticleOverlay({ doc, categoryName, employee, onClose, onReload }) {
  const [editing, setEditing] = useState(false)
  if (!doc) return null
  const isAdmin = employee?.role === 'admin'
  const restricted = (doc.visible_roles || []).length > 0

  return (
    <>
      <OverlayScreen
        title={doc.title}
        onClose={onClose}
        footer={isAdmin ? (
          <Button full variant="secondary" icon={Pencil} onClick={() => { haptic('tap'); setEditing(true) }}>
            Editar documento
          </Button>
        ) : undefined}
      >
        <article className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 px-1">
            {categoryName && <p className="text-xs font-bold uppercase tracking-wide text-bronze-dark">{categoryName}</p>}
            {isAdmin && restricted && (
              <span className="text-[11px] font-semibold text-ink/45">· {visibilityLabel(doc.visible_roles)}</span>
            )}
          </div>
          <Card className="p-4">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/80">{doc.body}</p>
          </Card>
        </article>
      </OverlayScreen>

      {editing && (
        <DocEditorScreen
          doc={doc}
          categoryId={doc.category_id}
          onClose={() => setEditing(false)}
          onSaved={() => { onReload?.(); onClose() }}
        />
      )}
    </>
  )
}
