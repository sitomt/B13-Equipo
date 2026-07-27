import { useEffect, useMemo, useRef, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import Sheet from '../../components/Sheet'
import { Card, ConfirmSheet, EmptyState } from '../../components/ui'
import { Button, Chip, SegmentedControl } from '../../components/controls'
import {
  createUtilityDoc,
  deleteClubFiles,
  deleteUtilityDoc,
  updateUtilityDoc,
  uploadClubFile,
} from '../../lib/api'
import { useToast } from '../../components/Toast'
import { haptic } from '../../lib/haptics'
import {
  Archive,
  Calendar,
  Camera,
  ExternalLink,
  File,
  More,
  Pencil,
  Plus,
  Refresh,
  Search,
  Trash,
  Upload,
  X,
} from '../../components/icons'
import {
  canSeeClubItem,
  clubItem,
  isArchived,
  matchesClubQuery,
  serializeClubPayload,
  sortedClubItems,
  todayLocal,
} from './clubContent'

const MAX_TOTAL_BYTES = 15 * 1024 * 1024
const MAX_IMAGES = 5
const ROLE_OPTIONS = [
  { key: 'coach', label: 'Coaches' },
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'maintenance', label: 'Mantenimiento' },
]

const longDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function dateValue(value) {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatMeetingDate(value, style = 'long') {
  const date = dateValue(value)
  if (!date) return 'Fecha sin especificar'
  return (style === 'short' ? shortDateFormatter : longDateFormatter).format(date)
}

function meetingTitle(value) {
  return `Reunión · ${formatMeetingDate(value, 'short')}`
}

function normalizeSearch(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function attachmentType(file) {
  const extension = file.name?.split('.').pop()?.toLowerCase() || ''
  if (file.type === 'application/pdf' || extension === 'pdf') return 'application/pdf'
  if (file.type?.startsWith('image/')) return file.type
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension)) {
    return extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
  }
  return ''
}

function isPdf(attachment) {
  return attachment?.type === 'application/pdf' ||
    attachment?.name?.toLowerCase().endsWith('.pdf')
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return []
  return attachments
    .filter((attachment) => attachment?.url)
    .map((attachment) => ({
      url: attachment.url,
      name: attachment.name || 'Archivo adjunto',
      type: attachment.type || '',
    }))
}

function meetingPayload(payload, archivedAt = payload?.archived_at || null) {
  return {
    kind: 'meeting',
    meeting_date: payload?.meeting_date || todayLocal(),
    notes: payload?.notes || '',
    attachments: normalizeAttachments(payload?.attachments),
    archived_at: archivedAt,
  }
}

function validateFiles(files) {
  if (!files.length) return ''
  const types = files.map(attachmentType)
  if (types.some((type) => !type)) {
    return 'Sube un PDF, JPG, PNG, WEBP o HEIC.'
  }

  const pdfCount = types.filter((type) => type === 'application/pdf').length
  const imageCount = types.filter((type) => type.startsWith('image/')).length
  if (pdfCount && (pdfCount > 1 || imageCount > 0)) {
    return 'El acta puede tener un PDF o hasta cinco imágenes, pero no ambos formatos.'
  }
  if (imageCount > MAX_IMAGES) {
    return `Puedes adjuntar un máximo de ${MAX_IMAGES} imágenes.`
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    return 'Los archivos superan el límite total de 15 MB.'
  }
  return ''
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function audienceLabel(visibleRoles = []) {
  if (visibleRoles.length === 0) return 'Todo el equipo'
  const roles = visibleRoles.filter((role) => role !== 'admin')
  if (roles.length === 0) return 'Solo admins'
  const labels = {
    coach: 'coaches',
    cleaning: 'limpieza',
    maintenance: 'mantenimiento',
  }
  return ['admins', ...roles.map((role) => labels[role] || role)].join(' y ')
}

function attachmentSummary(attachments) {
  const list = normalizeAttachments(attachments)
  if (list.length === 0) return 'Sin archivo'
  if (list.length === 1 && isPdf(list[0])) return '1 PDF'
  return `${list.length} ${list.length === 1 ? 'imagen' : 'imágenes'}`
}

function AttachmentPreview({ attachment, date, index }) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const label = `Abrir ${attachment.name || `archivo ${index + 1}`}`
  if (isPdf(attachment)) {
    return (
      <Card className="overflow-hidden">
        <div className="flex min-h-[64px] items-center gap-3 border-b border-ink/[0.06] px-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
            <File size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-ink">{attachment.name}</span>
            <span className="block text-xs text-ink/45">Documento PDF</span>
          </span>
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/65 active:scale-90"
          >
            <ExternalLink size={18} />
          </a>
        </div>
        <iframe
          src={attachment.url}
          title={`Acta de la reunión del ${formatMeetingDate(date)}`}
          className="h-[430px] w-full bg-white"
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {previewFailed ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 bg-ink/[0.03] px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bronze/10 text-bronze-dark">
            <File size={24} />
          </span>
          <p className="text-sm font-semibold text-ink/60">
            Este formato no se puede previsualizar aquí. Puedes abrir el archivo original.
          </p>
        </div>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="block bg-ink/[0.03] active:opacity-90"
        >
          <img
            src={attachment.url}
            alt={`Acta de la reunión del ${formatMeetingDate(date)}, imagen ${index + 1}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            onError={() => setPreviewFailed(true)}
            className="max-h-[70vh] w-full object-contain"
          />
        </a>
      )}
      <div className="flex min-h-[52px] items-center gap-3 border-t border-ink/[0.06] px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink/65">
          {attachment.name}
        </span>
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 font-bold text-bronze-dark"
        >
          Abrir <ExternalLink size={16} />
        </a>
      </div>
    </Card>
  )
}

function MeetingDetail({ item, isAdmin, onClose, onManage }) {
  const payload = meetingPayload(item.payload)
  const attachments = payload.attachments

  return (
    <OverlayScreen
      title={meetingTitle(payload.meeting_date)}
      onClose={onClose}
      footer={isAdmin ? (
        <Button
          full
          variant="secondary"
          icon={More}
          onClick={() => onManage(item)}
        >
          Gestionar acta
        </Button>
      ) : undefined}
    >
      <article className="space-y-5">
        <div className="px-1">
          <p className="font-semibold capitalize text-ink">{formatMeetingDate(payload.meeting_date)}</p>
          {isAdmin && (
            <p className="mt-1 text-sm text-ink/45">
              {audienceLabel(item.visible_roles)}
              {isArchived(item) ? ' · Archivada' : ''}
            </p>
          )}
        </div>

        {attachments.length > 0 ? (
          <div className="space-y-4">
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                key={`${attachment.url}-${index}`}
                attachment={attachment}
                date={payload.meeting_date}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={File}
            title="Esta acta no tiene archivo"
            subtitle="Es un registro anterior al nuevo sistema de reuniones."
          />
        )}

        {payload.notes && (
          <section>
            <h2 className="mb-2 px-1 font-display text-card font-bold text-ink">Notas</h2>
            <Card className="p-4">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/75">
                {payload.notes}
              </p>
            </Card>
          </section>
        )}
      </article>
    </OverlayScreen>
  )
}

function FileSelection({
  existingAttachments,
  pendingFiles,
  onPickCamera,
  onPickImages,
  onPickPdf,
  onRemoveExisting,
  onRemovePending,
  disabled,
  error,
}) {
  const selectedCount = pendingFiles.length || existingAttachments.length
  const pendingSize = pendingFiles.reduce((total, file) => total + file.size, 0)

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <label className="block text-[11px] font-bold uppercase text-ink/45">Archivo del acta</label>
          <p className="mt-1 text-xs text-ink/45">Un PDF o hasta 5 imágenes · 15 MB en total</p>
        </div>
        {selectedCount > 0 && (
          <span className="shrink-0 text-xs font-semibold text-ink/45">
            {selectedCount} {selectedCount === 1 ? 'archivo' : 'archivos'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onPickCamera}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-ink/5 px-2 text-center text-xs font-bold text-ink/65 active:scale-[0.97] disabled:opacity-40"
        >
          <Camera size={19} />
          Hacer foto
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onPickImages}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-ink/5 px-2 text-center text-xs font-bold text-ink/65 active:scale-[0.97] disabled:opacity-40"
        >
          <Upload size={19} />
          Imágenes
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onPickPdf}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-ink/5 px-2 text-center text-xs font-bold text-ink/65 active:scale-[0.97] disabled:opacity-40"
        >
          <File size={19} />
          PDF
        </button>
      </div>

      {error && <p role="alert" className="mt-2 px-1 text-sm font-semibold text-terracotta">{error}</p>}

      {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
        <Card className="mt-3 divide-y divide-ink/[0.06] overflow-hidden">
          {existingAttachments.map((attachment, index) => (
            <div key={`${attachment.url}-${index}`} className="flex min-h-[60px] items-center gap-3 px-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze/10 text-bronze-dark">
                <File size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{attachment.name}</span>
                <span className="block text-xs text-ink/40">Archivo publicado</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveExisting(index)}
                aria-label={`Quitar ${attachment.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/55 active:scale-90 disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>
          ))}
          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-h-[60px] items-center gap-3 px-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
                {attachmentType(file) === 'application/pdf' ? <File size={18} /> : <Camera size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{file.name}</span>
                <span className="block text-xs text-ink/40">{formatBytes(file.size)} · Preparado</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemovePending(index)}
                aria-label={`Quitar ${file.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/55 active:scale-90 disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {pendingFiles.length > 0 && (
        <p className="mt-2 px-1 text-xs text-ink/45">
          Selección nueva: {formatBytes(pendingSize)}. Al publicar sustituirá los archivos anteriores.
        </p>
      )}
    </div>
  )
}

function MeetingEditor({
  category,
  item,
  position,
  onClose,
  onSaved,
}) {
  const toast = useToast()
  const cameraInputRef = useRef(null)
  const imagesInputRef = useRef(null)
  const pdfInputRef = useRef(null)
  const isNew = !item?.id
  const initialPayload = meetingPayload(item?.payload)
  const initialRoles = item
    ? (item.visible_roles || []).length === 0
      ? ROLE_OPTIONS.map((role) => role.key)
      : item.visible_roles.filter((role) => role !== 'admin')
    : ['coach']

  const [meetingDate, setMeetingDate] = useState(initialPayload.meeting_date)
  const [notes, setNotes] = useState(initialPayload.notes)
  const [roles, setRoles] = useState(initialRoles)
  const [existingAttachments, setExistingAttachments] = useState(initialPayload.attachments)
  const [pendingFiles, setPendingFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)

  function toggleRole(role) {
    setRoles((current) => (
      current.includes(role)
        ? current.filter((value) => value !== role)
        : [...current, role]
    ))
  }

  function selectFiles(fileList, append = false) {
    const selected = Array.from(fileList || [])
    if (selected.length === 0) return

    const replacingPublished = existingAttachments.length > 0
    const candidate = append && !replacingPublished
      ? [...pendingFiles, ...selected]
      : selected
    const error = validateFiles(candidate)
    if (error) {
      setFileError(error)
      return
    }

    setFileError('')
    setFormError('')
    if (replacingPublished) setExistingAttachments([])
    setPendingFiles(candidate)
  }

  function handleInput(event, append = false) {
    selectFiles(event.target.files, append)
    event.target.value = ''
  }

  async function save() {
    setFormError('')
    setFileError('')
    if (!dateValue(meetingDate)) {
      setFormError('Selecciona una fecha válida para la reunión.')
      return
    }

    const finalCount = pendingFiles.length || existingAttachments.length
    if (finalCount === 0) {
      setFileError('Añade un PDF o al menos una imagen del acta.')
      return
    }

    const fileValidation = validateFiles(pendingFiles)
    if (fileValidation) {
      setFileError(fileValidation)
      return
    }

    setBusy(true)
    try {
      let attachments = existingAttachments
      if (pendingFiles.length > 0) {
        attachments = []
        for (let index = 0; index < pendingFiles.length; index += 1) {
          const file = pendingFiles[index]
          setProgress({
            current: index + 1,
            total: pendingFiles.length,
            percent: Math.round((index / pendingFiles.length) * 100),
          })
          const url = await uploadClubFile(file, `club/meetings/${category.id}`)
          attachments.push({
            url,
            name: file.name || `Archivo ${index + 1}`,
            type: attachmentType(file),
          })
          setProgress({
            current: index + 1,
            total: pendingFiles.length,
            percent: Math.round(((index + 1) / pendingFiles.length) * 100),
          })
        }
      }

      const payload = {
        kind: 'meeting',
        meeting_date: meetingDate,
        notes: notes.trim(),
        attachments: normalizeAttachments(attachments),
        archived_at: item?.payload?.archived_at || null,
      }
      const visibleRoles = roles.length > 0 ? roles : ['admin']
      const data = {
        title: meetingTitle(meetingDate),
        body: serializeClubPayload(payload),
        visible_roles: visibleRoles,
      }

      if (isNew) {
        await createUtilityDoc({
          category_id: category.id,
          position,
          ...data,
        })
      } else {
        await updateUtilityDoc(item.id, data)
      }
      const previousFilesRemoved = isNew || pendingFiles.length === 0
        ? true
        : await deleteClubFiles(initialPayload.attachments.map((attachment) => attachment.url))

      toast(
        previousFilesRemoved
          ? isNew ? 'Acta publicada' : 'Acta actualizada'
          : 'Acta actualizada; el archivo anterior queda pendiente de limpieza',
        previousFilesRemoved ? 'success' : 'error',
      )
      await onSaved?.()
      onClose()
    } catch (error) {
      console.error(error)
      setFormError('No se ha podido completar la subida. Tu formulario sigue guardado.')
      toast('No se pudo guardar el acta', 'error')
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <OverlayScreen
      title={isNew ? 'Subir acta' : 'Editar acta'}
      onClose={onClose}
      footer={(
        <Button full loading={busy} disabled={busy} onClick={save}>
          {isNew ? 'Publicar acta' : 'Guardar cambios'}
        </Button>
      )}
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase text-ink/45">
            Fecha de la reunión
          </span>
          <input
            type="date"
            value={meetingDate}
            disabled={busy}
            onChange={(event) => setMeetingDate(event.target.value)}
            className="field min-h-[50px] disabled:opacity-50"
          />
        </label>

        <FileSelection
          existingAttachments={existingAttachments}
          pendingFiles={pendingFiles}
          disabled={busy}
          error={fileError}
          onPickCamera={() => cameraInputRef.current?.click()}
          onPickImages={() => imagesInputRef.current?.click()}
          onPickPdf={() => pdfInputRef.current?.click()}
          onRemoveExisting={(index) => {
            setExistingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
          }}
          onRemovePending={(index) => {
            setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
            setFileError('')
          }}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          capture="environment"
          className="hidden"
          onChange={(event) => handleInput(event, true)}
        />
        <input
          ref={imagesInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          multiple
          className="hidden"
          onChange={(event) => handleInput(event)}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => handleInput(event)}
        />

        <label className="block">
          <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase text-ink/45">
            Notas <span className="font-medium normal-case text-ink/35">(opcional)</span>
          </span>
          <textarea
            value={notes}
            disabled={busy}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder="Acuerdos, temas tratados o información útil"
            className="field min-h-[132px] resize-y leading-relaxed disabled:opacity-50"
          />
        </label>

        <fieldset disabled={busy}>
          <legend className="mb-2 block px-1 text-[11px] font-bold uppercase text-ink/45">
            ¿Quién puede verla?
          </legend>
          <div className="flex flex-wrap gap-2">
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
          <p className="mt-2 px-1 text-xs text-ink/45">
            Dirección siempre tiene acceso. Ahora: {audienceLabel(roles.length ? roles : ['admin'])}.
          </p>
        </fieldset>

        {progress && (
          <div className="rounded-2xl bg-bronze/10 p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink/70">
              <span>Subiendo archivo {progress.current} de {progress.total}</span>
              <span className="tabular">{progress.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso de subida"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress.percent}
              className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"
            >
              <div
                className="h-full rounded-full bg-bronze-dark transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-2xl bg-terracotta/10 px-4 py-3 text-sm font-semibold text-terracotta">
            {formError}
          </p>
        )}
      </div>
    </OverlayScreen>
  )
}

function MeetingRow({ item, isAdmin, onOpen, onManage }) {
  const payload = meetingPayload(item.payload)
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          haptic('tap')
          onOpen(item)
        }}
        className="flex min-h-[76px] min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-ink/[0.03]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/10 text-bronze-dark">
          {payload.attachments.some(isPdf) ? <File size={19} /> : <Calendar size={19} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold capitalize text-ink">
            {formatMeetingDate(payload.meeting_date)}
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink/45">
            {payload.notes || attachmentSummary(payload.attachments)}
          </span>
          {isAdmin && (
            <span className="mt-1 block text-xs font-semibold text-bronze-dark">
              {audienceLabel(item.visible_roles)}
            </span>
          )}
        </span>
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={() => {
            haptic('tap')
            onManage(item)
          }}
          aria-label={`Gestionar acta del ${formatMeetingDate(payload.meeting_date)}`}
          className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/55 active:scale-90"
        >
          <More size={18} />
        </button>
      )}
    </div>
  )
}

export default function MeetingsScreen({
  category,
  docs,
  employee,
  initialItemId,
  onClose,
  onReload,
}) {
  const toast = useToast()
  const isAdmin = employee?.role === 'admin'
  const [query, setQuery] = useState('')
  const [view, setView] = useState('active')
  const [reading, setReading] = useState(null)
  const [editing, setEditing] = useState(null)
  const [menuItem, setMenuItem] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const allItems = useMemo(
    () => (docs || [])
      .map((doc) => clubItem(doc, 'meetings'))
      .filter((item) => canSeeClubItem(item, employee)),
    [docs, employee],
  )

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    const filtered = allItems.filter((item) => {
      if (view === 'archive' ? !isArchived(item) : isArchived(item)) return false
      if (!normalizedQuery) return true
      const formattedDate = normalizeSearch(formatMeetingDate(item.payload.meeting_date))
      return matchesClubQuery(item, query) || formattedDate.includes(normalizedQuery)
    })
    return sortedClubItems(filtered, 'meetings')
  }, [allItems, query, view])

  const groupedItems = useMemo(() => {
    const groups = []
    for (const item of visibleItems) {
      const date = dateValue(item.payload.meeting_date)
      const year = date ? String(date.getFullYear()) : 'Sin fecha'
      const lastGroup = groups[groups.length - 1]
      if (!lastGroup || lastGroup.year !== year) groups.push({ year, items: [item] })
      else lastGroup.items.push(item)
    }
    return groups
  }, [visibleItems])
  const initialItemHandled = useRef(null)

  useEffect(() => {
    if (!initialItemId || initialItemHandled.current === initialItemId) return
    const initialItem = allItems.find((item) => item.id === initialItemId)
    if (!initialItem || isArchived(initialItem)) return
    initialItemHandled.current = initialItemId
    setReading(initialItem)
  }, [allItems, initialItemId])

  async function archiveItem(item) {
    if (actionBusy) return
    setActionBusy(true)
    try {
      const payload = meetingPayload(item.payload, new Date().toISOString())
      await updateUtilityDoc(item.id, { body: serializeClubPayload(payload) })
      toast('Acta archivada')
      setReading(null)
      await onReload?.()
    } catch (error) {
      console.error(error)
      toast('No se pudo archivar el acta', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  async function restoreItem(item) {
    if (actionBusy) return
    setActionBusy(true)
    setMenuItem(null)
    try {
      const payload = meetingPayload(item.payload, null)
      await updateUtilityDoc(item.id, { body: serializeClubPayload(payload) })
      toast('Acta restaurada')
      setReading(null)
      await onReload?.()
    } catch (error) {
      console.error(error)
      toast('No se pudo restaurar el acta', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  async function permanentlyDelete(item) {
    if (actionBusy) return
    setActionBusy(true)
    try {
      await deleteUtilityDoc(item.id)
      const filesRemoved = await deleteClubFiles(
        normalizeAttachments(item.payload.attachments).map((attachment) => attachment.url),
      )
      toast(
        filesRemoved
          ? 'Acta eliminada definitivamente'
          : 'Acta eliminada; el archivo queda pendiente de limpieza',
        filesRemoved ? 'success' : 'error',
      )
      setReading(null)
      await onReload?.()
    } catch (error) {
      console.error(error)
      toast('No se pudo eliminar el acta', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  function openEditor(item) {
    setMenuItem(null)
    setReading(null)
    setEditing(item || {})
  }

  const emptyTitle = query.trim()
    ? `No encontramos resultados para “${query.trim()}”`
    : view === 'archive'
      ? 'El archivo está vacío'
      : isAdmin
        ? 'Todavía no hay actas'
        : 'No hay reuniones compartidas contigo'

  const emptySubtitle = query.trim()
    ? 'Prueba con otra fecha o palabra de las notas.'
    : view === 'archive'
      ? 'Las actas archivadas aparecerán aquí.'
      : isAdmin
        ? 'Sube una imagen o un PDF de la primera reunión.'
        : 'Cuando se publique una reunión para tu función, aparecerá aquí.'

  return (
    <>
      <OverlayScreen title="Reuniones" onClose={onClose}>
        <div className="space-y-4">
          {isAdmin && (
            <Button full icon={Plus} onClick={() => openEditor(null)}>
              Subir acta
            </Button>
          )}

          {isAdmin && (
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { key: 'active', label: 'Actas' },
                { key: 'archive', label: 'Archivo' },
              ]}
            />
          )}

          <div>
            <label htmlFor="meeting-search" className="mb-1.5 block px-1 text-xs font-bold text-ink/50">
              Buscar por fecha o notas
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                id="meeting-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. julio o mantenimiento"
                className="field min-h-[50px] !pl-11 !pr-12"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink/45 active:bg-ink/5"
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div>
              <EmptyState icon={view === 'archive' ? Archive : Calendar} title={emptyTitle} subtitle={emptySubtitle} />
              {query.trim() && (
                <Button
                  full
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setQuery('')}
                >
                  Borrar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedItems.map((group) => (
                <section key={group.year}>
                  <h2 className="mb-2 px-1 font-display text-card font-bold text-ink">{group.year}</h2>
                  <Card className="divide-y divide-ink/[0.06] overflow-hidden">
                    {group.items.map((item) => (
                      <MeetingRow
                        key={item.id}
                        item={item}
                        isAdmin={isAdmin}
                        onOpen={setReading}
                        onManage={setMenuItem}
                      />
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </div>
      </OverlayScreen>

      {reading && (
        <MeetingDetail
          item={reading}
          isAdmin={isAdmin}
          onClose={() => setReading(null)}
          onManage={setMenuItem}
        />
      )}

      {editing && (
        <MeetingEditor
          category={category}
          item={editing.id ? editing : null}
          position={(docs || []).length}
          onClose={() => setEditing(null)}
          onSaved={onReload}
        />
      )}

      <Sheet
        open={!!menuItem}
        onClose={() => setMenuItem(null)}
        title={menuItem ? meetingTitle(menuItem.payload.meeting_date) : 'Gestionar acta'}
      >
        {menuItem && !isArchived(menuItem) ? (
          <div className="space-y-2 pb-2">
            <Button full variant="secondary" icon={Pencil} onClick={() => openEditor(menuItem)}>
              Editar acta
            </Button>
            <Button
              full
              variant="secondary"
              icon={Archive}
              onClick={() => {
                setConfirmArchive(menuItem)
                setMenuItem(null)
              }}
            >
              Archivar acta
            </Button>
          </div>
        ) : menuItem ? (
          <div className="space-y-2 pb-2">
            <Button full variant="secondary" icon={Refresh} onClick={() => restoreItem(menuItem)}>
              Restaurar acta
            </Button>
            <Button
              full
              variant="danger"
              icon={Trash}
              onClick={() => {
                setConfirmDelete(menuItem)
                setMenuItem(null)
              }}
            >
              Eliminar definitivamente
            </Button>
          </div>
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => archiveItem(confirmArchive)}
        title="Archivar acta"
        message={confirmArchive
          ? `El acta del ${formatMeetingDate(confirmArchive.payload.meeting_date)} dejará de aparecer en la lista habitual. Podrás restaurarla desde Archivo.`
          : ''}
        confirmLabel="Archivar"
      />

      <ConfirmSheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => permanentlyDelete(confirmDelete)}
        title="Eliminar definitivamente"
        message={confirmDelete
          ? `Se eliminará para siempre el acta del ${formatMeetingDate(confirmDelete.payload.meeting_date)}. Esta acción no se puede deshacer.`
          : ''}
        confirmLabel="Eliminar"
        tone="danger"
      />
    </>
  )
}
