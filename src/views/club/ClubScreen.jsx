import { useMemo, useState } from 'react'
import { Card, SkeletonList } from '../../components/ui'
import { useData } from '../../lib/useData'
import { useToast } from '../../components/Toast'
import { listTimeBands, listUtilityCategories, listUtilityDocs } from '../../lib/api'
import { canSeeDoc, categoryIcon } from './utilityMeta'
import CategoryScreen from './CategoryScreen'
import CategorySheet from './CategorySheet'
import CalendarScreen from './CalendarScreen'
import UtilityArticleOverlay from './UtilityArticleOverlay'
import TeamOverlay from '../admin/TeamOverlay'
import AreasEditor from '../../components/AreasEditor'
import IncidenciaTypesEditor from '../../components/IncidenciaTypesEditor'
import TimeBandsEditor from '../schedule/TimeBandsEditor'
import { Search, Chevron, Plus, User, MapPin, Alert, Clock, Calendar } from '../../components/icons'

// Tile grande del launcher: caja de icono + título (2 líneas) + subtítulo.
function Tile({ icon: Icon, title, subtitle, onClick, dashed = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[124px] flex-col items-start gap-3 rounded-xl2 p-4 text-left transition active:scale-[0.97] ${
        dashed
          ? 'border-2 border-dashed border-ink/15 text-ink/50'
          : 'card-line bg-white shadow-card'
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${dashed ? 'bg-ink/[0.04] text-ink/40' : 'bg-bronze/12 text-bronze-dark'}`}>
        <Icon size={24} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-card font-bold leading-tight text-ink">{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs text-ink/45">{subtitle}</span>}
      </span>
    </button>
  )
}

// Sección de gestión (solo admin). Sus hooks (franjas) solo se montan aquí.
function GestionGrid() {
  const toast = useToast()
  const bands = useData(listTimeBands, [])
  const [team, setTeam] = useState(false)
  const [areas, setAreas] = useState(false)
  const [tags, setTags] = useState(false)
  const [bandsOpen, setBandsOpen] = useState(false)

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">Gestión</p>
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={User} title="Equipo" subtitle="Perfiles del equipo" onClick={() => setTeam(true)} />
        <Tile icon={MapPin} title="Áreas y zonas" subtitle="Locales de incidencias" onClick={() => setAreas(true)} />
        <Tile icon={Alert} title="Etiquetas" subtitle="Tipos de incidencia" onClick={() => setTags(true)} />
        <Tile icon={Clock} title="Franjas del gym" subtitle="Filas del cuadrante" onClick={() => setBandsOpen(true)} />
      </div>

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
    </div>
  )
}

// ============================================================================
// Club: launcher de tiles (una por categoría de documentos) + gestión del admin.
// Los documentos viven en Supabase (utility_categories / utility_docs). Vive
// FUERA del GeoGate: es consulta, se lee también desde casa.
// ============================================================================
export default function ClubScreen({ employee }) {
  const isAdmin = employee?.role === 'admin'
  const cats = useData(listUtilityCategories, [])
  const docsData = useData(listUtilityDocs, [])
  const [query, setQuery] = useState('')
  const [openCat, setOpenCat] = useState(null)   // categoría abierta (overlay)
  const [reading, setReading] = useState(null)    // doc en lectura desde búsqueda
  const [newCat, setNewCat] = useState(false)
  const [calendar, setCalendar] = useState(false) // calendario anual (overlay)

  const categories = cats.data || []
  const allDocs = docsData.data || []
  const loading = cats.loading || docsData.loading

  function reloadAll() {
    cats.reload(true)
    docsData.reload(true)
  }

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  // Docs por categoría (todos; el filtrado por rol se hace al mostrar/contar).
  const docsByCat = useMemo(() => {
    const map = {}
    for (const d of allDocs) (map[d.category_id] ||= []).push(d)
    return map
  }, [allDocs])

  // Nº de documentos visibles para este empleado por categoría.
  function visibleCount(catId) {
    return (docsByCat[catId] || []).filter((d) => canSeeDoc(d, employee)).length
  }

  // Resultados de búsqueda: docs visibles que matchean título/cuerpo.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allDocs
      .filter((d) => canSeeDoc(d, employee))
      .filter((d) =>
        d.title.toLowerCase().includes(q) ||
        (d.body || '').toLowerCase().includes(q) ||
        (catById[d.category_id]?.name || '').toLowerCase().includes(q))
  }, [query, allDocs, employee, catById])

  return (
    <div className="space-y-4 pb-24">
      {/* Buscador global */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar manuales, políticas, accesos…"
          className="w-full rounded-2xl border border-ink/10 bg-white py-3 pl-11 pr-4 text-base outline-none focus:border-bronze"
        />
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : query.trim() ? (
        /* Resultados de búsqueda */
        results.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-ink/45">Sin resultados. Prueba con otra búsqueda.</p>
        ) : (
          <Card className="divide-y divide-ink/[0.06] overflow-hidden">
            {results.map((d) => (
              <button
                key={d.id}
                onClick={() => setReading(d)}
                className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{d.title}</span>
                  <span className="block truncate text-xs text-ink/40">{catById[d.category_id]?.name || 'Documento'}</span>
                </span>
                <Chevron size={18} className="shrink-0 text-ink/25" />
              </button>
            ))}
          </Card>
        )
      ) : (
        /* Launcher: calendario + grid de categorías */
        <div className="space-y-6">
          {/* Acceso destacado al calendario anual (festividades y horarios del gym) */}
          <button
            onClick={() => setCalendar(true)}
            className="flex w-full items-center gap-4 rounded-xl2 bg-ink p-4 text-left text-white shadow-card transition active:scale-[0.98]"
          >
            <span className="brand-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Calendar size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-card font-bold leading-tight">Calendario anual</span>
              <span className="mt-0.5 block text-xs text-white/55">Festividades y horarios del gimnasio</span>
            </span>
            <Chevron size={20} className="shrink-0 text-white/40" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((c) => {
              const n = visibleCount(c.id)
              return (
                <Tile
                  key={c.id}
                  icon={categoryIcon(c.icon)}
                  title={c.name}
                  subtitle={`${n} ${n === 1 ? 'documento' : 'documentos'}`}
                  onClick={() => setOpenCat(c)}
                />
              )
            })}
            {isAdmin && (
              <Tile icon={Plus} title="Nueva categoría" dashed onClick={() => setNewCat(true)} />
            )}
          </div>

          {isAdmin && <GestionGrid />}
        </div>
      )}

      {openCat && (
        <CategoryScreen
          category={catById[openCat.id] || openCat}
          docs={docsByCat[openCat.id] || []}
          employee={employee}
          onClose={() => setOpenCat(null)}
          onReload={reloadAll}
        />
      )}

      {reading && (
        <UtilityArticleOverlay
          doc={reading}
          categoryName={catById[reading.category_id]?.name}
          employee={employee}
          onClose={() => setReading(null)}
          onReload={reloadAll}
        />
      )}

      <CategorySheet
        open={newCat}
        position={categories.length}
        onClose={() => setNewCat(false)}
        onSaved={reloadAll}
      />

      {calendar && <CalendarScreen employee={employee} onClose={() => setCalendar(false)} />}
    </div>
  )
}
