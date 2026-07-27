import { useMemo, useState } from 'react'
import { Card, EmptyState, SkeletonList } from '../../components/ui'
import { useData } from '../../lib/useData'
import { useToast } from '../../components/Toast'
import {
  createClubNotification,
  listTimeBands,
  listUtilityCategories,
  listUtilityDocs,
} from '../../lib/api'
import CalendarScreen from './CalendarScreen'
import ContactsScreen from './ContactsScreen'
import CredentialsScreen from './CredentialsScreen'
import LibraryScreen from './LibraryScreen'
import MeetingsScreen from './MeetingsScreen'
import TeamOverlay from '../admin/TeamOverlay'
import Sheet from '../../components/Sheet'
import AreasEditor from '../../components/AreasEditor'
import IncidenciaTypesEditor from '../../components/IncidenciaTypesEditor'
import TimeBandsEditor from '../schedule/TimeBandsEditor'
import {
  audienceRoles,
  canSeeClubItem,
  categoryForModule,
  CLUB_MODULES,
  clubItem,
  isArchived,
  matchesClubQuery,
  moduleVisibleToRole,
} from './clubContent'
import {
  Alert,
  Book,
  Calendar,
  Chat,
  Chevron,
  Clock,
  Key,
  MapPin,
  Search,
  Settings,
  User,
} from '../../components/icons'

const MODULE_ICONS = { Book, Alert, User, Chat, Key }

function ModuleTile({ module, count, onClick }) {
  const Icon = MODULE_ICONS[module.icon] || Book
  const unit = {
    manuals: count === 1 ? 'contenido' : 'contenidos',
    policies: count === 1 ? 'política' : 'políticas',
    contacts: count === 1 ? 'contacto' : 'contactos',
    meetings: count === 1 ? 'acta' : 'actas',
    credentials: count === 1 ? 'acceso' : 'accesos',
  }[module.key]

  return (
    <button
      type="button"
      onClick={onClick}
      className="card-line flex min-h-[116px] flex-col items-start gap-3 rounded-xl2 bg-white p-4 text-left shadow-card transition active:scale-[0.97]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bronze/12 text-bronze-dark">
        <Icon size={24} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-card font-bold leading-tight text-ink">{module.title}</span>
        <span className="mt-0.5 block text-xs text-ink/45">{count} {unit}</span>
      </span>
    </button>
  )
}

function ManagementRow({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-3 text-left active:bg-ink/[0.04]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-sm text-ink/45">{subtitle}</span>
      </span>
      <Chevron size={18} className="shrink-0 text-ink/25" />
    </button>
  )
}

function ManagementLauncher() {
  const toast = useToast()
  const bands = useData(listTimeBands, [])
  const [open, setOpen] = useState(false)
  const [team, setTeam] = useState(false)
  const [areas, setAreas] = useState(false)
  const [tags, setTags] = useState(false)
  const [bandsOpen, setBandsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[64px] w-full items-center gap-3 rounded-xl2 border border-ink/10 bg-white px-4 text-left shadow-card active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
          <Settings size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-card font-bold text-ink">Gestión del club</span>
          <span className="block text-sm text-ink/45">Equipo, espacios y configuración</span>
        </span>
        <Chevron size={19} className="shrink-0 text-ink/25" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Gestión del club">
        <div className="divide-y divide-ink/[0.06] pb-2">
          <ManagementRow icon={User} title="Equipo" subtitle="Perfiles, fichajes y geocerca" onClick={() => { setOpen(false); setTeam(true) }} />
          <ManagementRow icon={MapPin} title="Áreas y zonas" subtitle="Espacios usados en incidencias" onClick={() => { setOpen(false); setAreas(true) }} />
          <ManagementRow icon={Alert} title="Etiquetas de incidencia" subtitle="Tipos para clasificar reportes" onClick={() => { setOpen(false); setTags(true) }} />
          <ManagementRow icon={Clock} title="Franjas del gimnasio" subtitle="Filas del cuadrante semanal" onClick={() => { setOpen(false); setBandsOpen(true) }} />
        </div>
      </Sheet>

      {team && <TeamOverlay onClose={() => setTeam(false)} />}
      <AreasEditor open={areas} onClose={() => setAreas(false)} />
      <IncidenciaTypesEditor open={tags} onClose={() => setTags(false)} />
      <TimeBandsEditor
        open={bandsOpen}
        bands={bands.data || []}
        onClose={() => setBandsOpen(false)}
        onChanged={() => bands.reload(true)}
        toast={toast}
      />
    </>
  )
}

function usableItem(item, employee) {
  if (isArchived(item) || !canSeeClubItem(item, employee)) return false
  if (item.payload.status === 'draft' && employee.role !== 'admin') return false
  if (item.payload.kind === 'legacy-contact-list') return false
  if (item.payload.kind === 'legacy-credential-list') return false
  return true
}

export default function ClubScreen({ employee }) {
  const toast = useToast()
  const isAdmin = employee?.role === 'admin'
  const categoriesData = useData(listUtilityCategories, [])
  const docsData = useData(listUtilityDocs, [])
  const [query, setQuery] = useState('')
  const [openModule, setOpenModule] = useState(null)
  const [openItemId, setOpenItemId] = useState(null)
  const [calendar, setCalendar] = useState(false)

  const categories = categoriesData.data || []
  const docs = docsData.data || []
  const loading = categoriesData.loading || docsData.loading
  const modules = CLUB_MODULES.filter((module) => moduleVisibleToRole(module.key, employee?.role))

  const docsByModule = useMemo(() => {
    const result = Object.fromEntries(CLUB_MODULES.map((module) => [module.key, []]))
    for (const module of CLUB_MODULES) {
      const category = categoryForModule(categories, module.key)
      if (!category) continue
      result[module.key] = docs
        .filter((doc) => doc.category_id === category.id)
        .map((doc) => clubItem(doc, module.key))
    }
    return result
  }, [categories, docs])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    return modules.flatMap((module) =>
      (docsByModule[module.key] || [])
        .filter((item) => usableItem(item, employee))
        .filter((item) => matchesClubQuery(item, query))
        .map((item) => ({ item, module })),
    )
  }, [docsByModule, employee, modules, query])

  function reloadAll() {
    return Promise.all([categoriesData.reload(true), docsData.reload(true)])
  }

  function countFor(moduleKey) {
    return (docsByModule[moduleKey] || []).filter((item) => usableItem(item, employee)).length
  }

  async function notifyPublication({ title, isNew, visibleRoles, changeNote, moduleKey }) {
    const module = CLUB_MODULES.find((entry) => entry.key === moduleKey)
    try {
      await createClubNotification({
        employee,
        title: `${isNew ? 'Nuevo' : 'Actualizado'}: ${title}`,
        body: changeNote || `${module?.title || 'Contenido del Club'} disponible en El club.`,
        targetRoles: audienceRoles(visibleRoles),
      })
    } catch {
      toast('Contenido guardado, pero no se pudo crear el aviso', 'error')
    }
  }

  const selectedModule = CLUB_MODULES.find((module) => module.key === openModule)
  const selectedCategory = selectedModule
    ? categoryForModule(categories, selectedModule.key)
    : null
  const selectedDocs = selectedModule
    ? docs.filter((doc) => doc.category_id === selectedCategory?.id)
    : []

  return (
    <div className="space-y-5 pb-24">
      <div>
        <label htmlFor="club-search" className="mb-1.5 block px-1 text-xs font-bold text-ink/50">
          Buscar en El club
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            id="club-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Contactos, manuales o políticas"
            className="field !pl-11"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : query.trim() ? (
        searchResults.length ? (
          <Card className="divide-y divide-ink/[0.06] overflow-hidden">
            {searchResults.map(({ item, module }) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setOpenItemId(item.id)
                  setOpenModule(module.key)
                  setQuery('')
                }}
                className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left active:bg-ink/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink">{item.title}</span>
                  <span className="block text-xs text-ink/40">{module.title}</span>
                </span>
                <Chevron size={18} className="shrink-0 text-ink/25" />
              </button>
            ))}
          </Card>
        ) : (
          <EmptyState icon={Search} title={`No hay resultados para “${query.trim()}”`} />
        )
      ) : (
        <>
          <button
            type="button"
            onClick={() => setCalendar(true)}
            className="flex min-h-[80px] w-full items-center gap-4 rounded-xl2 bg-ink p-4 text-left text-white shadow-card active:scale-[0.98]"
          >
            <span className="brand-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Calendar size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-card font-bold">Calendario anual</span>
              <span className="mt-0.5 block text-xs text-white/55">Festividades y horarios especiales</span>
            </span>
            <Chevron size={20} className="shrink-0 text-white/40" />
          </button>

          <section aria-labelledby="club-sections-title">
            <p id="club-sections-title" className="mb-2 px-1 text-xs font-bold uppercase text-ink/40">
              Información del club
            </p>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((module) => (
                <ModuleTile
                  key={module.key}
                  module={module}
                  count={countFor(module.key)}
                  onClick={() => {
                    setOpenItemId(null)
                    setOpenModule(module.key)
                  }}
                />
              ))}
            </div>
          </section>

          {isAdmin && <ManagementLauncher />}
        </>
      )}

      {calendar && <CalendarScreen employee={employee} onClose={() => setCalendar(false)} />}

      {selectedModule?.key === 'contacts' && selectedCategory && (
        <ContactsScreen
          category={selectedCategory}
          docs={selectedDocs}
          employee={employee}
          onClose={() => { setOpenModule(null); setOpenItemId(null) }}
          onReload={reloadAll}
        />
      )}
      {selectedModule?.key === 'meetings' && selectedCategory && (
        <MeetingsScreen
          category={selectedCategory}
          docs={selectedDocs}
          employee={employee}
          initialItemId={openItemId}
          onClose={() => { setOpenModule(null); setOpenItemId(null) }}
          onReload={reloadAll}
        />
      )}
      {(selectedModule?.key === 'manuals' || selectedModule?.key === 'policies') && selectedCategory && (
        <LibraryScreen
          moduleKey={selectedModule.key}
          category={selectedCategory}
          docs={selectedDocs}
          employee={employee}
          initialItemId={openItemId}
          onClose={() => { setOpenModule(null); setOpenItemId(null) }}
          onReload={reloadAll}
          onPublished={(payload) => notifyPublication({
            ...payload,
            moduleKey: selectedModule.key,
          })}
        />
      )}
      {selectedModule?.key === 'credentials' && selectedCategory && (
        <CredentialsScreen
          category={selectedCategory}
          docs={selectedDocs}
          employee={employee}
          onClose={() => { setOpenModule(null); setOpenItemId(null) }}
          onReload={reloadAll}
        />
      )}
    </div>
  )
}
