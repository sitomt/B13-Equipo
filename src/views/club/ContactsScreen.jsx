import { useMemo, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import Sheet from '../../components/Sheet'
import { Button } from '../../components/controls'
import { Card, ConfirmSheet, EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  Archive,
  Chat,
  More,
  Pencil,
  Phone,
  Plus,
  Refresh,
  Search,
  Star,
  Trash,
  User,
} from '../../components/icons'
import {
  createUtilityDoc,
  deleteUtilityDoc,
  updateUtilityDoc,
} from '../../lib/api'
import { haptic } from '../../lib/haptics'
import {
  clubItem,
  isArchived,
  serializeClubPayload,
  sortedClubItems,
} from './clubContent'

const EMPTY_FORM = {
  service: '',
  name: '',
  company: '',
  phone: '',
  notes: '',
  whatsapp: true,
  priority: false,
}

function normalized(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function phoneHref(phone) {
  const value = (phone || '').trim()
  const prefix = value.startsWith('+') ? '+' : ''
  return `tel:${prefix}${value.replace(/\D/g, '')}`
}

function whatsappHref(phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9) digits = `34${digits}`
  return `https://wa.me/${digits}`
}

function validate(form) {
  const errors = {}
  if (!form.service.trim()) errors.service = 'Introduce el servicio u oficio.'
  if (!form.name.trim()) errors.name = 'Introduce el nombre del contacto.'
  if (!form.phone.trim()) {
    errors.phone = 'Introduce un teléfono.'
  } else {
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'Introduce un teléfono válido.'
    }
  }
  return errors
}

function Field({ id, label, error, children }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink/45">
        {label}
      </span>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1.5 block px-1 text-xs font-semibold text-terracotta">
          {error}
        </span>
      )}
    </label>
  )
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic('tap')
        onChange(!checked)
      }}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-ink/[0.04] px-4 py-2 text-left transition active:scale-[0.99]"
    >
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-sage' : 'bg-ink/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="block text-xs leading-snug text-ink/45">{hint}</span>}
      </span>
    </button>
  )
}

export default function ContactsScreen({ category, docs, employee, onClose, onReload }) {
  const toast = useToast()
  const isAdmin = employee?.role === 'admin'
  const [query, setQuery] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [editorItem, setEditorItem] = useState(null)
  const [actionItem, setActionItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const structuredItems = useMemo(
    () => sortedClubItems(
      (docs || [])
        .map((doc) => clubItem(doc, 'contacts'))
        .filter((item) => item.payload.kind === 'contact'),
      'contacts',
    ),
    [docs],
  )

  const visibleItems = useMemo(() => {
    const targetArchived = isAdmin && showArchive
    const needle = normalized(query)
    return structuredItems.filter((item) => {
      if (isArchived(item) !== targetArchived) return false
      if (!needle) return true
      const payload = item.payload
      return normalized([
        payload.service,
        payload.name,
        payload.company,
        payload.phone,
      ].filter(Boolean).join(' ')).includes(needle)
    })
  }, [isAdmin, query, showArchive, structuredItems])

  function openCreate() {
    haptic('tap')
    setForm(EMPTY_FORM)
    setErrors({})
    setEditorItem({})
  }

  function openEdit(item) {
    haptic('tap')
    setActionItem(null)
    setForm({
      service: item.payload.service || '',
      name: item.payload.name || '',
      company: item.payload.company || '',
      phone: item.payload.phone || '',
      notes: item.payload.notes || '',
      whatsapp: item.payload.whatsapp !== false,
      priority: Boolean(item.payload.priority),
    })
    setErrors({})
    setEditorItem(item)
  }

  function closeEditor() {
    if (busy) return
    setEditorItem(null)
    setErrors({})
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  async function saveContact(event) {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      haptic('error')
      return
    }

    const payload = {
      kind: 'contact',
      service: form.service.trim(),
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      whatsapp: form.whatsapp,
      priority: form.priority,
      status: 'published',
      version: editorItem?.payload?.version || 1,
      archived_at: editorItem?.payload?.archived_at || null,
    }
    const title = `${payload.service} · ${payload.name}`

    setBusy(true)
    try {
      if (editorItem?.id) {
        await updateUtilityDoc(editorItem.id, {
          title,
          body: serializeClubPayload(payload),
          visible_roles: [],
        })
      } else {
        await createUtilityDoc({
          category_id: category.id,
          title,
          body: serializeClubPayload(payload),
          visible_roles: [],
          position: structuredItems.length,
        })
      }
      await onReload?.()
      toast(editorItem?.id ? 'Contacto actualizado' : 'Contacto añadido')
      setEditorItem(null)
      setErrors({})
    } catch (error) {
      console.error(error)
      toast('No se ha podido guardar. Tus cambios siguen aquí.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function setArchived(item, archived) {
    if (!isAdmin) return
    setBusy(true)
    try {
      await updateUtilityDoc(item.id, {
        body: serializeClubPayload({
          ...item.payload,
          archived_at: archived ? new Date().toISOString() : null,
        }),
      })
      await onReload?.()
      setActionItem(null)
      toast(archived ? 'Contacto archivado' : 'Contacto restaurado')
    } catch (error) {
      console.error(error)
      toast(archived ? 'No se pudo archivar' : 'No se pudo restaurar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function permanentlyDelete(item) {
    if (!isAdmin || !isArchived(item)) return
    setBusy(true)
    try {
      await deleteUtilityDoc(item.id)
      await onReload?.()
      setActionItem(null)
      setDeleteItem(null)
      toast('Contacto eliminado definitivamente')
    } catch (error) {
      console.error(error)
      toast('No se pudo eliminar el contacto', 'error')
    } finally {
      setBusy(false)
    }
  }

  const emptyTitle = showArchive
    ? 'El archivo está vacío'
    : query
      ? `No hay resultados para “${query.trim()}”`
      : 'Todavía no hay contactos útiles'

  return (
    <>
      <OverlayScreen title={category?.name || 'Contactos útiles'} onClose={onClose}>
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button full icon={Plus} onClick={openCreate}>
                Añadir contacto
              </Button>
              <button
                type="button"
                onClick={() => {
                  haptic('tap')
                  setShowArchive((current) => !current)
                  setQuery('')
                }}
                aria-pressed={showArchive}
                aria-label={showArchive ? 'Volver a contactos activos' : 'Abrir archivo de contactos'}
                className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl transition active:scale-95 ${
                  showArchive ? 'bg-ink text-white shadow-float' : 'bg-ink/5 text-ink/65'
                }`}
              >
                <Archive size={20} />
              </button>
            </div>
          )}

          {showArchive && (
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="font-display text-card font-extrabold text-ink">Archivo</h2>
                <p className="text-xs text-ink/45">Contactos retirados de la lista principal.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowArchive(false)}>
                Ver activos
              </Button>
            </div>
          )}

          <label className="relative block">
            <span className="sr-only">Buscar contactos</span>
            <Search
              size={19}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por servicio, nombre o empresa"
              className="min-h-[50px] w-full rounded-2xl border border-ink/10 bg-white py-3 pl-11 pr-4 text-base text-ink outline-none transition placeholder:text-ink/35 focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </label>

          {visibleItems.length === 0 ? (
            <EmptyState
              icon={User}
              title={emptyTitle}
              subtitle={
                showArchive
                  ? 'Los contactos que archives aparecerán aquí.'
                  : query
                    ? 'Prueba con otro nombre, empresa u oficio.'
                    : isAdmin
                      ? 'Añade el primero para que todo el equipo pueda consultarlo.'
                      : 'Dirección todavía no ha añadido ningún contacto.'
              }
            />
          ) : (
            <div className="space-y-3" aria-live="polite">
              {visibleItems.map((item) => {
                const payload = item.payload
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="px-4 pb-3 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {payload.priority && (
                              <>
                                <Star size={15} className="shrink-0 text-ochre" aria-hidden="true" />
                                <span className="sr-only">Contacto prioritario. </span>
                              </>
                            )}
                            <p className="truncate text-[11px] font-extrabold uppercase tracking-wide text-bronze-dark">
                              {payload.service}
                            </p>
                          </div>
                          <h2 className="mt-0.5 break-words font-display text-card font-extrabold text-ink">
                            {payload.name}
                          </h2>
                          {payload.company && (
                            <p className="mt-0.5 break-words text-sm text-ink/55">{payload.company}</p>
                          )}
                          <p className="mt-1 font-semibold tabular-nums text-ink/70">{payload.phone}</p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              haptic('tap')
                              setActionItem(item)
                            }}
                            aria-label={`Gestionar contacto ${payload.name}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink/55 transition active:scale-90"
                          >
                            <More size={20} />
                          </button>
                        )}
                      </div>
                      {payload.notes && (
                        <p className="mt-3 whitespace-pre-wrap border-t border-ink/[0.06] pt-3 text-sm leading-relaxed text-ink/55">
                          {payload.notes}
                        </p>
                      )}
                    </div>

                    {!showArchive && (
                      <div className="grid grid-cols-2 gap-px border-t border-ink/[0.06] bg-ink/[0.06]">
                        <a
                          href={phoneHref(payload.phone)}
                          onClick={() => haptic('tap')}
                          className={`flex min-h-[52px] items-center justify-center gap-2 bg-white px-3 text-sm font-extrabold text-ink transition active:bg-ink/[0.03] ${
                            payload.whatsapp ? '' : 'col-span-2'
                          }`}
                          aria-label={`Llamar a ${payload.name}`}
                        >
                          <Phone size={18} aria-hidden="true" />
                          Llamar
                        </a>
                        {payload.whatsapp && (
                          <a
                            href={whatsappHref(payload.phone)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => haptic('tap')}
                            className="flex min-h-[52px] items-center justify-center gap-2 bg-white px-3 text-sm font-extrabold text-sage transition active:bg-ink/[0.03]"
                            aria-label={`Escribir por WhatsApp a ${payload.name}`}
                          >
                            <Chat size={18} aria-hidden="true" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </OverlayScreen>

      <Sheet
        open={editorItem !== null}
        onClose={closeEditor}
        title={editorItem?.id ? 'Editar contacto' : 'Añadir contacto'}
        maxH="92vh"
      >
        <form onSubmit={saveContact} noValidate className="space-y-4 pb-2">
          <Field id="contact-service" label="Servicio u oficio" error={errors.service}>
            <input
              id="contact-service"
              data-sheet-autofocus
              value={form.service}
              onChange={(event) => setField('service', event.target.value)}
              aria-invalid={Boolean(errors.service)}
              aria-describedby={errors.service ? 'contact-service-error' : undefined}
              placeholder="Ej. Fontanería"
              autoComplete="organization-title"
              className="min-h-[50px] w-full rounded-2xl border border-ink/10 bg-white px-4 text-base outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </Field>

          <Field id="contact-name" label="Nombre" error={errors.name}>
            <input
              id="contact-name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              placeholder="Ej. José Martínez"
              autoComplete="name"
              className="min-h-[50px] w-full rounded-2xl border border-ink/10 bg-white px-4 text-base outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </Field>

          <Field id="contact-company" label="Empresa (opcional)">
            <input
              id="contact-company"
              value={form.company}
              onChange={(event) => setField('company', event.target.value)}
              placeholder="Ej. Fontanería Martínez"
              autoComplete="organization"
              className="min-h-[50px] w-full rounded-2xl border border-ink/10 bg-white px-4 text-base outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </Field>

          <Field id="contact-phone" label="Teléfono" error={errors.phone}>
            <input
              id="contact-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
              placeholder="Ej. 612 345 678"
              autoComplete="tel"
              className="min-h-[50px] w-full rounded-2xl border border-ink/10 bg-white px-4 text-base outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </Field>

          <Toggle
            checked={form.whatsapp}
            onChange={(value) => setField('whatsapp', value)}
            label="Tiene WhatsApp"
            hint="Mostrará el acceso directo para escribirle."
          />

          <Toggle
            checked={form.priority}
            onChange={(value) => setField('priority', value)}
            label="Contacto prioritario"
            hint="Aparecerá antes que el resto en la lista."
          />

          <Field id="contact-notes" label="Notas (opcional)">
            <textarea
              id="contact-notes"
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
              rows={3}
              placeholder="Horario, disponibilidad u otra información útil"
              className="w-full resize-y rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base leading-relaxed outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/15"
            />
          </Field>

          <Button type="submit" full loading={busy}>
            Guardar contacto
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={actionItem !== null}
        onClose={() => {
          if (!busy) setActionItem(null)
        }}
        title={actionItem?.payload?.name || 'Gestionar contacto'}
      >
        {actionItem && (
          <div className="space-y-2 pb-2">
            {isArchived(actionItem) ? (
              <>
                <Button
                  full
                  variant="secondary"
                  icon={Refresh}
                  loading={busy}
                  onClick={() => setArchived(actionItem, false)}
                >
                  Restaurar contacto
                </Button>
                <Button
                  full
                  variant="secondary"
                  icon={Trash}
                  disabled={busy}
                  className="!text-terracotta"
                  onClick={() => {
                    setActionItem(null)
                    setDeleteItem(actionItem)
                  }}
                >
                  Eliminar definitivamente
                </Button>
              </>
            ) : (
              <>
                <Button
                  full
                  variant="secondary"
                  icon={Pencil}
                  disabled={busy}
                  onClick={() => openEdit(actionItem)}
                >
                  Editar contacto
                </Button>
                <Button
                  full
                  variant="secondary"
                  icon={Archive}
                  loading={busy}
                  onClick={() => setArchived(actionItem, true)}
                >
                  Archivar contacto
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => permanentlyDelete(deleteItem)}
        title="Eliminar definitivamente"
        message={
          deleteItem
            ? `Se eliminará “${deleteItem.payload.name}”. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        tone="danger"
      />
    </>
  )
}
