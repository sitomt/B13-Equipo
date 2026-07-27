import { useEffect, useMemo, useRef, useState } from 'react'
import OverlayScreen from '../../components/OverlayScreen'
import Sheet from '../../components/Sheet'
import PinPad from '../../components/PinPad'
import { Button } from '../../components/controls'
import { Card, ConfirmSheet, EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  createUtilityDoc,
  deleteUtilityDoc,
  updateUtilityDoc,
  verifyPin,
} from '../../lib/api'
import {
  canSeeClubItem,
  clubItem,
  isArchived,
  matchesClubQuery,
  serializeClubPayload,
  visibilityLabelForItem,
} from './clubContent'
import {
  Archive,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  More,
  Pencil,
  Plus,
  Search,
  Trash,
} from '../../components/icons'

function CredentialEditor({ category, item, position, onClose, onSaved }) {
  const toast = useToast()
  const current = item?.payload || {}
  const [service, setService] = useState(current.service || '')
  const [username, setUsername] = useState(current.username || '')
  const [password, setPassword] = useState(current.password || '')
  const [url, setUrl] = useState(current.url || '')
  const [notes, setNotes] = useState(current.notes || '')
  const [audience, setAudience] = useState(
    item?.visible_roles?.includes('coach') ? 'coach' : 'admin',
  )
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function save() {
    const nextErrors = {}
    if (!service.trim()) nextErrors.service = 'Indica el servicio o sistema.'
    if (!password) nextErrors.password = 'Introduce la contraseña.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      const payload = serializeClubPayload({
        kind: 'credential',
        service: service.trim(),
        username: username.trim(),
        password,
        url: url.trim(),
        notes: notes.trim(),
        archived_at: current.archived_at || null,
      })
      const visible_roles = audience === 'coach' ? ['coach'] : ['admin']
      if (item?.id) {
        await updateUtilityDoc(item.id, {
          title: service.trim(),
          body: payload,
          visible_roles,
        })
      } else {
        await createUtilityDoc({
          category_id: category.id,
          title: service.trim(),
          body: payload,
          visible_roles,
          position,
        })
      }
      toast(item?.id ? 'Acceso actualizado' : 'Acceso añadido')
      await onSaved()
      onClose()
    } catch {
      toast('No se ha podido guardar. Tus cambios siguen aquí.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OverlayScreen
      title={item?.id ? 'Editar acceso' : 'Añadir acceso'}
      onClose={onClose}
      footer={<Button full loading={busy} onClick={save}>Guardar acceso</Button>}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="field-label">Servicio o sistema</span>
          <input
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="field"
            placeholder="Ej. Alarma del gimnasio"
            aria-invalid={Boolean(errors.service)}
          />
          {errors.service && <p role="alert" className="field-error">{errors.service}</p>}
        </label>

        <label className="block">
          <span className="field-label">Usuario o correo</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="field"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Opcional"
          />
        </label>

        <label className="block">
          <span className="field-label">Contraseña</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p role="alert" className="field-error">{errors.password}</p>}
        </label>

        <label className="block">
          <span className="field-label">Enlace</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="field"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://..."
          />
        </label>

        <label className="block">
          <span className="field-label">Notas</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="field"
            rows={3}
            placeholder="Instrucciones que no contengan otras claves"
          />
        </label>

        <fieldset>
          <legend className="field-label">Quién puede consultarla</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'admin', label: 'Solo admins' },
              { key: 'coach', label: 'Admins y coaches' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setAudience(option.key)}
                aria-pressed={audience === option.key}
                className={`min-h-[50px] rounded-2xl px-3 text-sm font-bold ${
                  audience === option.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink/60'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/45">
            Podrán consultar esta contraseña: {audience === 'coach' ? 'admins y coaches' : 'solo admins'}.
          </p>
        </fieldset>
      </div>
    </OverlayScreen>
  )
}

export default function CredentialsScreen({ category, docs, employee, onClose, onReload }) {
  const toast = useToast()
  const isAdmin = employee?.role === 'admin'
  const [query, setQuery] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [editing, setEditing] = useState(null)
  const [actionsFor, setActionsFor] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pinRequest, setPinRequest] = useState(null)
  const [pinReset, setPinReset] = useState(0)
  const [pinShake, setPinShake] = useState(false)
  const [pinBusy, setPinBusy] = useState(false)
  const [revealedId, setRevealedId] = useState(null)
  const revealTimer = useRef(null)

  const items = useMemo(
    () => docs
      .map((doc) => clubItem(doc, 'credentials'))
      .filter((item) => item.payload.kind === 'credential')
      .filter((item) => canSeeClubItem(item, employee)),
    [docs, employee],
  )
  const active = items.filter((item) => !isArchived(item))
  const archived = items.filter(isArchived)
  const visible = (showArchive ? archived : active)
    .filter((item) => matchesClubQuery(item, query))

  function hideSecret() {
    window.clearTimeout(revealTimer.current)
    revealTimer.current = null
    setRevealedId(null)
  }

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) hideSecret()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearTimeout(revealTimer.current)
    }
  }, [])

  function requestPin(item, action) {
    hideSecret()
    setPinShake(false)
    setPinReset((value) => value + 1)
    setPinRequest({ item, action })
  }

  async function onPinComplete(pin) {
    if (!pinRequest) return
    setPinBusy(true)
    try {
      const valid = await verifyPin(employee.id, pin)
      if (!valid) {
        setPinShake(true)
        setPinReset((value) => value + 1)
        toast('El PIN no es correcto', 'error')
        return
      }

      const { item, action } = pinRequest
      if (action === 'copy') {
        await navigator.clipboard.writeText(item.payload.password)
        toast('Contraseña copiada')
      } else if (action === 'edit') {
        setEditing(item)
        setActionsFor(null)
      } else {
        setRevealedId(item.id)
        revealTimer.current = window.setTimeout(hideSecret, 15000)
      }
      setPinRequest(null)
    } catch {
      setPinShake(true)
      setPinReset((value) => value + 1)
      toast('No se pudo comprobar el PIN', 'error')
    } finally {
      setPinBusy(false)
    }
  }

  async function setArchived(item, archivedAt) {
    try {
      await updateUtilityDoc(item.id, {
        body: serializeClubPayload({ ...item.payload, archived_at: archivedAt }),
      })
      setActionsFor(null)
      toast(archivedAt ? 'Acceso archivado' : 'Acceso restaurado')
      await onReload()
    } catch {
      toast('No se pudo actualizar', 'error')
    }
  }

  async function remove(item) {
    try {
      await deleteUtilityDoc(item.id)
      toast('Acceso eliminado')
      await onReload()
    } catch {
      toast('No se pudo eliminar', 'error')
    }
  }

  return (
    <>
      <OverlayScreen title="Accesos y contraseñas" onClose={onClose}>
        <div className="mb-4 rounded-xl2 border border-bronze/20 bg-bronze/[0.07] p-3">
          <p className="text-sm font-bold text-ink">Acceso protegido por PIN</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/55">
            En esta fase piloto se pedirá tu PIN cada vez que muestres o copies una contraseña.
          </p>
        </div>

        <div className="mb-4 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar accesos</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field !pl-10"
              placeholder="Buscar servicio o usuario"
            />
          </label>
          {isAdmin && !showArchive && (
            <button
              type="button"
              onClick={() => setEditing({})}
              aria-label="Añadir acceso"
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-ink text-white"
            >
              <Plus size={21} />
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Key}
            title={
              query.trim()
                ? 'No hay resultados'
                : showArchive
                  ? 'No hay accesos archivados'
                  : 'Todavía no hay accesos disponibles'
            }
            subtitle={
              query.trim()
                ? 'Prueba a buscar por servicio o usuario.'
                : isAdmin && !showArchive
                  ? 'Añade el primero con el botón superior.'
                  : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const revealed = revealedId === item.id
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">
                      <Key size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-card font-bold text-ink">{item.payload.service || item.title}</p>
                      {item.payload.username && <p className="mt-0.5 break-all text-sm text-ink/50">{item.payload.username}</p>}
                      {isAdmin && <p className="mt-1 text-xs font-semibold text-bronze-dark">{visibilityLabelForItem(item)}</p>}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setActionsFor(item)}
                        aria-label={`Más acciones para ${item.payload.service || item.title}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/55"
                      >
                        <More size={20} />
                      </button>
                    )}
                  </div>

                  {!showArchive && (
                    <div className="mt-3 flex min-h-[48px] items-center rounded-xl bg-ink/[0.035] px-3">
                      <span className={`min-w-0 flex-1 break-all font-mono text-sm ${revealed ? 'text-ink' : 'tracking-widest text-ink/45'}`}>
                        {revealed ? item.payload.password : '••••••••••••'}
                      </span>
                      {revealed && (
                        <button type="button" onClick={hideSecret} aria-label="Ocultar contraseña" className="flex h-11 w-11 items-center justify-center text-ink/45">
                          <EyeOff size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {item.payload.notes && <p className="mt-3 text-sm leading-relaxed text-ink/55">{item.payload.notes}</p>}

                  {!showArchive && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="sm" icon={Eye} onClick={() => requestPin(item, 'show')}>
                        Mostrar
                      </Button>
                      <Button variant="secondary" size="sm" icon={Copy} onClick={() => requestPin(item, 'copy')}>
                        Copiar
                      </Button>
                    </div>
                  )}
                  {!showArchive && item.payload.url && (
                    <a
                      href={item.payload.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-bronze-dark"
                    >
                      <ExternalLink size={16} /> Abrir servicio
                    </a>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {isAdmin && (showArchive || archived.length > 0) && (
          <button
            type="button"
            onClick={() => { setShowArchive((value) => !value); setQuery('') }}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-ink/5 px-4 text-sm font-bold text-ink/60"
          >
            <Archive size={17} /> {showArchive ? 'Volver a accesos activos' : `Archivo (${archived.length})`}
          </button>
        )}
      </OverlayScreen>

      {editing && (
        <CredentialEditor
          category={category}
          item={editing.id ? editing : null}
          position={docs.length}
          onClose={() => setEditing(null)}
          onSaved={onReload}
        />
      )}

      <Sheet open={Boolean(actionsFor)} onClose={() => setActionsFor(null)} title={actionsFor?.payload?.service || 'Acceso'}>
        {actionsFor && (
          <div className="space-y-2 pb-2">
            {!isArchived(actionsFor) ? (
              <>
                <Button
                  full
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => requestPin(actionsFor, 'edit')}
                >
                  Editar acceso
                </Button>
                <Button full variant="secondary" icon={Archive} onClick={() => setArchived(actionsFor, new Date().toISOString())}>
                  Archivar acceso
                </Button>
              </>
            ) : (
              <>
                <Button full variant="secondary" icon={Archive} onClick={() => setArchived(actionsFor, null)}>
                  Restaurar acceso
                </Button>
                <Button full variant="danger" icon={Trash} onClick={() => { setConfirmDelete(actionsFor); setActionsFor(null) }}>
                  Eliminar definitivamente
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(pinRequest)}
        onClose={() => { if (!pinBusy) setPinRequest(null) }}
        title="Confirma tu PIN"
        maxH="92vh"
      >
        {pinRequest && (
          <PinPad
            title={
              pinRequest.action === 'copy'
                ? 'Copiar contraseña'
                : pinRequest.action === 'edit'
                  ? 'Editar acceso'
                  : 'Mostrar contraseña'
            }
            subtitle={pinRequest.item.payload.service || pinRequest.item.title}
            onComplete={onPinComplete}
            resetSignal={pinReset}
            shake={pinShake}
            disabled={pinBusy}
            tone="light"
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete)}
        title="Eliminar acceso"
        message="Se eliminarán definitivamente sus datos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
      />
    </>
  )
}
