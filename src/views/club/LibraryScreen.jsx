import { useEffect, useMemo, useRef, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import { Button, Chip, SegmentedControl } from '../../components/controls'
import { Card, ConfirmSheet, EmptyState, Tag } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  createUtilityDoc,
  deleteClubFiles,
  deleteUtilityDoc,
  updateUtilityDoc,
  uploadClubFile,
} from '../../lib/api'
import { haptic } from '../../lib/haptics'
import {
  Archive,
  Book,
  Chevron,
  ExternalLink,
  File,
  Pencil,
  Plus,
  Refresh,
  Search,
  Trash,
  Upload,
  X,
} from '../../components/icons'
import {
  articleSummary,
  canSeeClubItem,
  clubItem,
  isArchived,
  matchesClubQuery,
  serializeClubPayload,
  sortedClubItems,
  visibilityLabelForItem,
} from './clubContent'

const MODULE_META = {
  manuals: {
    title: 'Manuales y protocolos',
    singular: 'contenido',
    createLabel: 'Crear contenido',
    emptyTitle: 'Todavía no hay manuales ni protocolos',
    emptySubtitle: 'Aquí aparecerá la información operativa vigente del gimnasio.',
  },
  policies: {
    title: 'Políticas',
    singular: 'política',
    createLabel: 'Crear política',
    emptyTitle: 'No hay políticas publicadas',
    emptySubtitle: 'Las políticas vigentes aparecerán aquí cuando dirección las publique.',
  },
}

const ROLE_OPTIONS = [
  { key: 'coach', label: 'Coaches' },
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'maintenance', label: 'Mantenimiento' },
]

const MANUAL_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'manual', label: 'Manuales' },
  { key: 'protocol', label: 'Protocolos' },
]

const STATUS_OPTIONS = [
  { key: 'draft', label: 'Borrador' },
  { key: 'published', label: 'Publicado' },
]

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif']
const INPUT_CLASS =
  'field w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45'
const TEXTAREA_CLASS =
  'w-full resize-y rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base leading-relaxed outline-none focus:border-bronze focus-visible:ring-2 focus-visible:ring-bronze/45'

function typeLabel(type, moduleKey) {
  if (moduleKey === 'policies') return 'Política'
  return type === 'protocol' ? 'Protocolo' : 'Manual'
}

function normalizeAttachment(attachment) {
  if (!attachment) return null
  if (typeof attachment === 'string') {
    return { url: attachment, name: 'Archivo adjunto', type: '' }
  }
  return attachment.url ? attachment : null
}

function isImageAttachment(attachment) {
  const type = attachment?.type || ''
  const extension = attachment?.name?.split('.').pop()?.toLowerCase()
  return ['image/jpeg', 'image/png'].includes(type) || ['jpg', 'jpeg', 'png'].includes(extension)
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function validateFile(file) {
  if (!file) return ''
  const extension = file.name?.split('.').pop()?.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Este formato no es compatible. Sube un PDF, JPG, PNG o HEIC.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'El archivo supera el máximo de 15 MB.'
  }
  return ''
}

function SearchField({ value, onChange }) {
  return (
    <div>
      <label htmlFor="library-search" className="mb-1.5 block px-1 text-xs font-bold text-ink/50">
        Buscar
      </label>
      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
        />
        <input
          id="library-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Buscar por título o contenido"
          className={`${INPUT_CLASS} !pl-11 ${value ? '!pr-12' : ''}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar búsqueda"
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink/45 transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

function AttachmentLink({ attachment }) {
  const normalized = normalizeAttachment(attachment)
  if (!normalized) return null

  return (
    <section aria-labelledby="attachment-title" className="space-y-2">
      <h2 id="attachment-title" className="px-1 font-display text-card font-bold text-ink">
        Archivo adjunto
      </h2>
      {isImageAttachment(normalized) && (
        <a
          href={normalized.url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl2 bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
        >
          <img
            src={normalized.url}
            alt={`Vista previa de ${normalized.name || 'archivo adjunto'}`}
            className="max-h-[52vh] w-full object-contain"
          />
        </a>
      )}
      <a
        href={normalized.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-[56px] w-full items-center gap-3 rounded-xl2 bg-white px-4 py-3 text-left shadow-card transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">
          <File size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">
            {normalized.name || 'Abrir archivo adjunto'}
          </span>
          <span className="block text-sm text-ink/45">Abrir en una nueva ventana</span>
        </span>
        <ExternalLink size={18} aria-hidden="true" className="shrink-0 text-ink/35" />
      </a>
    </section>
  )
}

function LibraryRow({ item, moduleKey, isAdmin, onRead, onEdit }) {
  const { payload } = item
  const summary = payload.summary || articleSummary(payload.content)
  const updatedAt = formatDate(item.updated_at || item.created_at)

  return (
    <div className="flex items-stretch gap-1 px-1">
      <button
        type="button"
        onClick={onRead}
        className="flex min-h-[76px] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-ink/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bronze/45"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">
          <Book size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold leading-snug text-ink">{item.title}</span>
            {isAdmin && payload.status === 'draft' && <Tag status="draft" />}
          </span>
          {summary && (
            <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-ink/50">
              {summary}
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-ink/40">
            <span>{typeLabel(payload.type, moduleKey)}</span>
            <span>v{payload.version || 1}</span>
            {updatedAt && <span>{updatedAt}</span>}
          </span>
        </span>
        <Chevron size={18} aria-hidden="true" className="shrink-0 text-ink/25" />
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${item.title}`}
          className="my-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink/45 transition active:scale-90 active:bg-ink/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
        >
          <Pencil size={18} />
        </button>
      )}
    </div>
  )
}

function ArticleReader({ item, moduleKey, employee, onClose, onEdit }) {
  const isAdmin = employee?.role === 'admin'
  const { payload } = item
  const summary = payload.summary || ''
  const attachment = normalizeAttachment(payload.attachment)

  return (
    <OverlayScreen
      title={item.title}
      onClose={onClose}
      footer={
        isAdmin ? (
          <Button full variant="secondary" icon={Pencil} onClick={onEdit}>
            Editar {moduleKey === 'policies' ? 'política' : 'contenido'}
          </Button>
        ) : undefined
      }
    >
      <article className="space-y-5 pb-4">
        <header className="space-y-2 px-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-bronze-dark">
            <span>{typeLabel(payload.type, moduleKey)}</span>
            <span className="text-ink/25" aria-hidden="true">·</span>
            <span className="text-ink/45">Versión {payload.version || 1}</span>
            {isAdmin && (
              <>
                <span className="text-ink/25" aria-hidden="true">·</span>
                <span className="text-ink/45">{visibilityLabelForItem(item)}</span>
              </>
            )}
          </div>
          {payload.status === 'draft' && <Tag status="draft" />}
          {summary && (
            <p className="text-lg font-semibold leading-relaxed text-ink/70">{summary}</p>
          )}
        </header>

        <section aria-labelledby="article-content-title">
          <h2 id="article-content-title" className="sr-only">Contenido</h2>
          <Card className="p-4 sm:p-5">
            <p className="whitespace-pre-wrap break-words text-base leading-[1.75] text-ink/80">
              {payload.content || 'Este contenido todavía no tiene texto.'}
            </p>
          </Card>
        </section>

        <AttachmentLink attachment={attachment} />

        {isAdmin && payload.change_note && (
          <section className="rounded-xl2 border border-ink/10 px-4 py-3">
            <h2 className="text-xs font-bold uppercase text-ink/40">Último cambio</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/65">{payload.change_note}</p>
          </section>
        )}
      </article>
    </OverlayScreen>
  )
}

function AudienceField({ roles, onChange }) {
  const everyone = roles.length === 0

  function toggleRole(role) {
    onChange(roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role])
  }

  return (
    <fieldset>
      <legend className="mb-2 px-1 text-xs font-bold uppercase text-ink/40">
        Audiencia
      </legend>
      <div className="flex flex-wrap gap-2">
        <Chip selected={everyone} onClick={() => onChange([])}>
          Todo el equipo
        </Chip>
        {ROLE_OPTIONS.map((role) => (
          <Chip
            key={role.key}
            selected={roles.includes(role.key)}
            onClick={() => toggleRole(role.key)}
          >
            {role.label}
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-ink/45">
        Dirección siempre tendrá acceso. Si no eliges roles, será visible para todo el equipo.
      </p>
    </fieldset>
  )
}

function FileField({ existing, file, removed, error, onPick, onRemove }) {
  const fileInputRef = useRef(null)
  const current = file
    ? { name: file.name, type: file.type }
    : removed
      ? null
      : normalizeAttachment(existing)

  return (
    <div>
      <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
        Archivo adjunto <span className="normal-case text-ink/30">(opcional)</span>
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif"
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files?.[0] || null)
          event.target.value = ''
        }}
      />
      {current ? (
        <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">
            <File size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{current.name}</span>
            <span className="block text-xs text-ink/40">
              {file ? 'Se subirá al guardar' : 'Archivo actual'}
            </span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar archivo adjunto"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-terracotta transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35"
          >
            <Trash size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 bg-white px-4 font-bold text-ink/60 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
        >
          <Upload size={18} /> Seleccionar PDF o imagen
        </button>
      )}
      {current && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 min-h-[44px] px-2 text-sm font-bold text-bronze-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/45"
        >
          Sustituir archivo
        </button>
      )}
      <p className="px-1 text-xs text-ink/40">PDF, JPG, PNG o HEIC. Máximo 15 MB.</p>
      {error && <p className="mt-1 px-1 text-sm font-semibold text-terracotta" role="alert">{error}</p>}
    </div>
  )
}

function LibraryEditor({
  item,
  moduleKey,
  category,
  docs,
  onClose,
  onReload,
  onPublished,
  onArchived,
}) {
  const toast = useToast()
  const isNew = !item?.id
  const payload = item?.payload || {}
  const [title, setTitle] = useState(item?.title || '')
  const [type, setType] = useState(
    moduleKey === 'policies' ? 'policy' : payload.type === 'protocol' ? 'protocol' : 'manual',
  )
  const [summary, setSummary] = useState(payload.summary || '')
  const [content, setContent] = useState(payload.content || '')
  const [status, setStatus] = useState(payload.status || 'draft')
  const initialRoles = item?.id ? item.visible_roles || [] : ['coach']
  const [roles, setRoles] = useState(initialRoles)
  const [changeNote, setChangeNote] = useState(payload.change_note || '')
  const [file, setFile] = useState(null)
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const titleRef = useRef(null)
  const contentRef = useRef(null)

  const dirty =
    title !== (item?.title || '') ||
    type !== (moduleKey === 'policies' ? 'policy' : payload.type === 'protocol' ? 'protocol' : 'manual') ||
    summary !== (payload.summary || '') ||
    content !== (payload.content || '') ||
    status !== (payload.status || 'draft') ||
    JSON.stringify(roles) !== JSON.stringify(initialRoles) ||
    changeNote !== (payload.change_note || '') ||
    Boolean(file) ||
    removeAttachment

  function requestClose() {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  function pickFile(nextFile) {
    const error = validateFile(nextFile)
    setFileError(error)
    if (error) {
      setFile(null)
      return
    }
    setFile(nextFile)
    setRemoveAttachment(false)
  }

  function validate() {
    const nextErrors = {}
    if (!title.trim()) nextErrors.title = 'Escribe un título.'
    if (!content.trim()) nextErrors.content = 'Añade el contenido que se leerá en la aplicación.'
    setErrors(nextErrors)

    if (nextErrors.title) titleRef.current?.focus()
    else if (nextErrors.content) contentRef.current?.focus()
    return Object.keys(nextErrors).length === 0
  }

  async function save() {
    if (!validate() || fileError) return
    if (!category?.id) {
      toast('No se ha encontrado la sección del Club', 'error')
      return
    }

    setBusy(true)
    try {
      let attachment = removeAttachment ? null : normalizeAttachment(payload.attachment)
      if (file) {
        const url = await uploadClubFile(file, `club/${moduleKey}`)
        attachment = {
          url,
          name: file.name,
          type: file.type || '',
          size: file.size,
        }
      }

      const nextPayload = {
        kind: moduleKey === 'policies' ? 'policy' : 'article',
        type,
        summary: summary.trim() || articleSummary(content),
        content: content.trim(),
        status,
        version:
          isNew || status === 'draft'
            ? Number(payload.version) || 1
            : (Number(payload.version) || 1) + 1,
        attachment,
        change_note: changeNote.trim(),
        archived_at: null,
      }
      const body = serializeClubPayload(nextPayload)
      const cleanTitle = title.trim()
      let rawItem

      if (isNew) {
        const lastPosition = docs.reduce(
          (highest, doc) => Math.max(highest, Number(doc.position) || 0),
          0,
        )
        rawItem = await createUtilityDoc({
          category_id: category.id,
          title: cleanTitle,
          body,
          visible_roles: roles,
          position: lastPosition + 1,
        })
      } else {
        await updateUtilityDoc(item.id, {
          title: cleanTitle,
          body,
          visible_roles: roles,
        })
        rawItem = {
          ...item,
          title: cleanTitle,
          body,
          visible_roles: roles,
          updated_at: new Date().toISOString(),
        }
        delete rawItem.payload
        delete rawItem.moduleKey
      }
      const previousFileRemoved =
        isNew || !(file || removeAttachment) || !payload.attachment?.url
          ? true
          : await deleteClubFiles([payload.attachment.url])

      const savedItem = clubItem(rawItem, moduleKey)
      let notificationFailed = false
      if (status === 'published' && onPublished) {
        try {
          await onPublished({
            item: savedItem,
            title: cleanTitle,
            isNew,
            visibleRoles: roles,
            changeNote: changeNote.trim(),
          })
        } catch (error) {
          notificationFailed = true
          console.error(error)
        }
      }

      haptic('success')
      toast(
        !previousFileRemoved
          ? 'Guardado; el archivo anterior queda pendiente de limpieza'
          : notificationFailed
          ? 'Guardado, pero no se pudo generar el aviso'
          : status === 'published'
            ? isNew ? 'Contenido publicado' : 'Nueva versión publicada'
            : 'Borrador guardado',
        !previousFileRemoved || notificationFailed ? 'error' : 'success',
      )
      await onReload?.()
      onClose()
    } catch (error) {
      console.error(error)
      toast(file ? 'No se pudo guardar o subir el archivo' : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function archiveItem() {
    setBusy(true)
    try {
      const archivedPayload = {
        ...payload,
        archived_at: new Date().toISOString(),
      }
      await updateUtilityDoc(item.id, {
        body: serializeClubPayload(archivedPayload),
      })
      haptic('warning')
      toast('Contenido archivado')
      await onReload?.()
      onArchived?.()
      onClose()
    } catch (error) {
      console.error(error)
      toast('No se pudo archivar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <OverlayScreen
        title={isNew ? MODULE_META[moduleKey].createLabel : `Editar ${MODULE_META[moduleKey].singular}`}
        onClose={requestClose}
        footer={
          <Button full loading={busy} onClick={save}>
            {status === 'published' ? 'Publicar' : 'Guardar borrador'}
          </Button>
        }
      >
        <div className="space-y-5 pb-4" role="form" aria-label="Editor de la biblioteca">
          {Object.values(errors).some(Boolean) && (
            <div className="rounded-2xl bg-terracotta/10 px-4 py-3 text-sm font-semibold text-terracotta" role="alert">
              Revisa los campos señalados.
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
              Título
            </span>
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (errors.title) setErrors((current) => ({ ...current, title: '' }))
              }}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'library-title-error' : undefined}
              placeholder={
                moduleKey === 'policies'
                  ? 'Ej. Política de acceso al gimnasio'
                  : 'Ej. Protocolo de cierre'
              }
              className={INPUT_CLASS}
              autoFocus={isNew}
            />
            {errors.title && (
              <span id="library-title-error" className="mt-1 block px-1 text-sm font-semibold text-terracotta">
                {errors.title}
              </span>
            )}
          </label>

          {moduleKey === 'manuals' && (
            <div>
              <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
                Tipo
              </span>
              <SegmentedControl
                value={type}
                onChange={setType}
                options={[
                  { key: 'manual', label: 'Manual' },
                  { key: 'protocol', label: 'Protocolo' },
                ]}
              />
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
              Resumen <span className="normal-case text-ink/30">(opcional)</span>
            </span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={2}
              maxLength={220}
              placeholder="Una frase para reconocerlo rápidamente"
              className={TEXTAREA_CLASS}
            />
            <span className="mt-1 block px-1 text-right text-xs text-ink/35">
              {summary.length}/220
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
              Contenido
            </span>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                if (errors.content) setErrors((current) => ({ ...current, content: '' }))
              }}
              rows={12}
              aria-invalid={Boolean(errors.content)}
              aria-describedby={errors.content ? 'library-content-error' : 'library-content-help'}
              placeholder="Escribe el contenido con párrafos, pasos y listas…"
              className={TEXTAREA_CLASS}
            />
            <span id="library-content-help" className="mt-1 block px-1 text-xs text-ink/40">
              Los saltos de línea se conservarán en la lectura.
            </span>
            {errors.content && (
              <span id="library-content-error" className="mt-1 block px-1 text-sm font-semibold text-terracotta">
                {errors.content}
              </span>
            )}
          </label>

          <FileField
            existing={payload.attachment}
            file={file}
            removed={removeAttachment}
            error={fileError}
            onPick={pickFile}
            onRemove={() => {
              setFile(null)
              setFileError('')
              setRemoveAttachment(true)
            }}
          />

          <AudienceField roles={roles} onChange={setRoles} />

          <div>
            <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
              Estado
            </span>
            <SegmentedControl value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <p className="mt-2 px-1 text-xs leading-relaxed text-ink/45">
              {status === 'published'
                ? 'Será visible para la audiencia elegida y podrá generar una notificación.'
                : 'Solo dirección podrá verlo hasta que se publique.'}
            </p>
          </div>

          {status === 'published' && (
            <label className="block">
              <span className="mb-1.5 block px-1 text-xs font-bold uppercase text-ink/40">
                Qué ha cambiado <span className="normal-case text-ink/30">(opcional)</span>
              </span>
              <textarea
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                rows={2}
                maxLength={220}
                placeholder="Ej. Se ha actualizado el horario de cierre"
                className={TEXTAREA_CLASS}
              />
            </label>
          )}

          {!isNew && (
            <div className="border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-terracotta transition active:bg-terracotta/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35"
              >
                <Archive size={17} /> Archivar contenido
              </button>
            </div>
          )}
        </div>
      </OverlayScreen>

      <ConfirmSheet
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={onClose}
        title="Descartar cambios"
        message="Los cambios que no hayas guardado se perderán."
        confirmLabel="Descartar"
        tone="danger"
      />

      <ConfirmSheet
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archiveItem}
        title="Archivar contenido"
        message={`"${item?.title}" dejará de aparecer en la biblioteca, pero podrás restaurarlo desde Archivo.`}
        confirmLabel="Archivar"
        tone="danger"
      />
    </>
  )
}

function ArchiveScreen({ items, moduleKey, onClose, onReload }) {
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function restore(item) {
    setBusyId(item.id)
    try {
      await updateUtilityDoc(item.id, {
        body: serializeClubPayload({ ...item.payload, archived_at: null }),
      })
      haptic('success')
      toast('Contenido restaurado')
      await onReload?.()
    } catch (error) {
      console.error(error)
      toast('No se pudo restaurar', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item) {
    setBusyId(item.id)
    try {
      await deleteUtilityDoc(item.id)
      let fileRemoved = true
      if (item.payload.attachment?.url) {
        fileRemoved = await deleteClubFiles([item.payload.attachment.url])
      }
      haptic('warning')
      toast(
        fileRemoved
          ? 'Contenido eliminado definitivamente'
          : 'Contenido eliminado; el archivo queda pendiente de limpieza',
        fileRemoved ? 'success' : 'error',
      )
      await onReload?.()
    } catch (error) {
      console.error(error)
      toast('No se pudo eliminar', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <OverlayScreen title="Archivo" onClose={onClose}>
        <p className="mb-4 px-1 text-sm leading-relaxed text-ink/55">
          El contenido archivado no aparece al equipo. Puedes restaurarlo o eliminarlo definitivamente.
        </p>
        {items.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="El archivo está vacío"
            subtitle="El contenido que archives aparecerá aquí."
          />
        ) : (
          <Card className="divide-y divide-ink/[0.06] overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] text-ink/50">
                    <Archive size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold leading-snug text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-ink/40">
                      {typeLabel(item.payload.type, moduleKey)}
                      {item.payload.archived_at && ` · Archivado ${formatDate(item.payload.archived_at)}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 pl-14">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Refresh}
                    loading={busyId === item.id}
                    disabled={Boolean(busyId)}
                    onClick={() => restore(item)}
                    className="flex-1"
                  >
                    Restaurar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                    disabled={Boolean(busyId)}
                    aria-label={`Eliminar definitivamente ${item.title}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta transition active:scale-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </OverlayScreen>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete)}
        title="Eliminar definitivamente"
        message={confirmDelete ? `Se eliminará "${confirmDelete.title}". Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        tone="danger"
      />
    </>
  )
}

export default function LibraryScreen({
  moduleKey,
  category,
  docs,
  employee,
  initialItemId,
  onClose,
  onReload,
  onPublished,
}) {
  const safeModuleKey = moduleKey === 'policies' ? 'policies' : 'manuals'
  const meta = MODULE_META[safeModuleKey]
  const isAdmin = employee?.role === 'admin'
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [reading, setReading] = useState(null)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const allItems = useMemo(
    () => sortedClubItems((docs || []).map((doc) => clubItem(doc, safeModuleKey)), safeModuleKey),
    [docs, safeModuleKey],
  )

  const activeItems = useMemo(
    () => allItems.filter((item) => {
      if (isArchived(item) || !canSeeClubItem(item, employee)) return false
      if (!isAdmin && item.payload.status !== 'published') return false
      if (!matchesClubQuery(item, query)) return false
      if (safeModuleKey === 'manuals' && filter !== 'all') {
        return item.payload.type === filter
      }
      return true
    }),
    [allItems, employee, filter, isAdmin, query, safeModuleKey],
  )

  const archivedItems = useMemo(
    () => allItems.filter(isArchived),
    [allItems],
  )
  const initialItemHandled = useRef(null)

  useEffect(() => {
    if (!initialItemId || initialItemHandled.current === initialItemId) return
    const initialItem = allItems.find((item) => item.id === initialItemId)
    if (!initialItem || isArchived(initialItem) || !canSeeClubItem(initialItem, employee)) return
    initialItemHandled.current = initialItemId
    setReading(initialItem)
  }, [allItems, employee, initialItemId])

  const hasSearchOrFilter = query.trim() || (safeModuleKey === 'manuals' && filter !== 'all')

  return (
    <>
      <OverlayScreen title={meta.title} onClose={onClose}>
        <div className="space-y-4 pb-6">
          {isAdmin && (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={Archive}
                onClick={() => setShowArchive(true)}
              >
                Archivo
              </Button>
              <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>
                {safeModuleKey === 'policies' ? 'Nueva política' : 'Crear'}
              </Button>
            </div>
          )}

          <SearchField value={query} onChange={setQuery} />

          {safeModuleKey === 'manuals' && (
            <div role="group" aria-label="Filtrar biblioteca">
              <SegmentedControl
                options={MANUAL_FILTERS}
                value={filter}
                onChange={setFilter}
              />
            </div>
          )}

          {activeItems.length === 0 ? (
            <EmptyState
              icon={Book}
              title={hasSearchOrFilter ? 'No encontramos resultados' : meta.emptyTitle}
              subtitle={
                hasSearchOrFilter
                  ? 'Prueba otra búsqueda o cambia el filtro.'
                  : isAdmin
                    ? `Usa “${meta.createLabel}” para añadir el primero.`
                    : meta.emptySubtitle
              }
            />
          ) : (
            <Card className="divide-y divide-ink/[0.06] overflow-hidden">
              {activeItems.map((item) => (
                <LibraryRow
                  key={item.id}
                  item={item}
                  moduleKey={safeModuleKey}
                  isAdmin={isAdmin}
                  onRead={() => {
                    haptic('tap')
                    setReading(item)
                  }}
                  onEdit={() => {
                    haptic('tap')
                    setEditing(item)
                  }}
                />
              ))}
            </Card>
          )}
        </div>
      </OverlayScreen>

      {reading && (
        <ArticleReader
          item={reading}
          moduleKey={safeModuleKey}
          employee={employee}
          onClose={() => setReading(null)}
          onEdit={() => {
            setReading(null)
            setEditing(reading)
          }}
        />
      )}

      {creating && (
        <LibraryEditor
          moduleKey={safeModuleKey}
          category={category}
          docs={docs || []}
          onClose={() => setCreating(false)}
          onReload={onReload}
          onPublished={onPublished}
        />
      )}

      {editing && (
        <LibraryEditor
          item={editing}
          moduleKey={safeModuleKey}
          category={category}
          docs={docs || []}
          onClose={() => setEditing(null)}
          onReload={onReload}
          onPublished={onPublished}
          onArchived={() => setReading(null)}
        />
      )}

      {showArchive && (
        <ArchiveScreen
          items={archivedItems}
          moduleKey={safeModuleKey}
          onClose={() => setShowArchive(false)}
          onReload={onReload}
        />
      )}
    </>
  )
}
