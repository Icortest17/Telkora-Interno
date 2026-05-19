'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Upload, LayoutGrid, List, ChevronDown, SlidersHorizontal, X, BookmarkPlus, Bookmark } from 'lucide-react'
import { SECTORES, FUENTES, ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { EstadoLead } from '@/types'

const PRESETS_KEY = 'telkora_pipeline_presets'

interface FilterPreset {
  id: string
  nombre: string
  sector: string
  fuente: string
  prioridad: string
  soloMios: boolean
  estadosFiltro: EstadoLead[]
  valorMinimo: number
  soloSinFollowup: boolean
  soloUrgentes: boolean
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'pipeline_activo',
    nombre: 'Pipeline activo',
    sector: 'todos',
    fuente: 'todas',
    prioridad: 'todas',
    soloMios: false,
    estadosFiltro: ['contactado', 'reunion', 'propuesta', 'negociacion'],
    valorMinimo: 0,
    soloSinFollowup: false,
    soloUrgentes: false,
  },
  {
    id: 'urgentes',
    nombre: 'Urgentes',
    sector: 'todos',
    fuente: 'todas',
    prioridad: 'todas',
    soloMios: false,
    estadosFiltro: [],
    valorMinimo: 0,
    soloSinFollowup: false,
    soloUrgentes: true,
  },
  {
    id: 'sin_followup',
    nombre: 'Sin follow-up',
    sector: 'todos',
    fuente: 'todas',
    prioridad: 'todas',
    soloMios: false,
    estadosFiltro: [],
    valorMinimo: 0,
    soloSinFollowup: true,
    soloUrgentes: false,
  },
]

export interface LeadFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  sector: string
  onSectorChange: (v: string) => void
  fuente: string
  onFuenteChange: (v: string) => void
  prioridad: string
  onPrioridadChange: (v: string) => void
  soloMios: boolean
  onSoloMiosChange: (v: boolean) => void
  estadosFiltro: EstadoLead[]
  onEstadosFiltroChange: (v: EstadoLead[]) => void
  valorMinimo: number
  onValorMinimoChange: (v: number) => void
  soloSinFollowup: boolean
  onSoloSinFollowupChange: (v: boolean) => void
  soloUrgentes: boolean
  onSoloUrgentesChange: (v: boolean) => void
  onNuevoLead: () => void
  onImportar: () => void
  vista: 'kanban' | 'lista'
  onVistaChange: (v: 'kanban' | 'lista') => void
  compact?: boolean
  onCompactChange?: (v: boolean) => void
}

export function LeadFilters({
  search, onSearchChange,
  sector, onSectorChange,
  fuente, onFuenteChange,
  prioridad, onPrioridadChange,
  soloMios, onSoloMiosChange,
  estadosFiltro, onEstadosFiltroChange,
  valorMinimo, onValorMinimoChange,
  soloSinFollowup, onSoloSinFollowupChange,
  soloUrgentes, onSoloUrgentesChange,
  onNuevoLead, onImportar,
  vista, onVistaChange,
  compact, onCompactChange,
}: LeadFiltersProps) {
  const [showMore, setShowMore] = useState(false)
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showGuardarVista, setShowGuardarVista] = useState(false)
  const [nombrePreset, setNombrePreset] = useState('')
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRESETS
    try {
      const stored = localStorage.getItem(PRESETS_KEY)
      if (stored) {
        const parsed: FilterPreset[] = JSON.parse(stored)
        // Merge defaults with stored (defaults always present)
        const storedIds = parsed.map((p) => p.id)
        const merged = [
          ...DEFAULT_PRESETS.filter((d) => !storedIds.includes(d.id)),
          ...parsed,
        ]
        return merged
      }
    } catch { /* empty */ }
    return DEFAULT_PRESETS
  })

  const estadoDropdownRef = useRef<HTMLDivElement>(null)
  const presetsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (estadoDropdownRef.current && !estadoDropdownRef.current.contains(e.target as Node)) {
        setShowEstadoDropdown(false)
      }
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false)
        setShowGuardarVista(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function savePresetsToStorage(updated: FilterPreset[]) {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    } catch { /* empty */ }
    setPresets(updated)
  }

  function handleGuardarVista() {
    if (!nombrePreset.trim()) return
    const nuevo: FilterPreset = {
      id: `custom_${Date.now()}`,
      nombre: nombrePreset.trim(),
      sector,
      fuente,
      prioridad,
      soloMios,
      estadosFiltro,
      valorMinimo,
      soloSinFollowup,
      soloUrgentes,
    }
    savePresetsToStorage([...presets, nuevo])
    setNombrePreset('')
    setShowGuardarVista(false)
  }

  function handleApplyPreset(preset: FilterPreset) {
    onSectorChange(preset.sector)
    onFuenteChange(preset.fuente)
    onPrioridadChange(preset.prioridad)
    onSoloMiosChange(preset.soloMios)
    onEstadosFiltroChange(preset.estadosFiltro)
    onValorMinimoChange(preset.valorMinimo)
    onSoloSinFollowupChange(preset.soloSinFollowup)
    onSoloUrgentesChange(preset.soloUrgentes)
    setShowPresets(false)
  }

  function handleDeletePreset(id: string) {
    // Can't delete defaults
    if (DEFAULT_PRESETS.some((d) => d.id === id)) return
    savePresetsToStorage(presets.filter((p) => p.id !== id))
  }

  function toggleEstado(estado: EstadoLead) {
    if (estadosFiltro.includes(estado)) {
      onEstadosFiltroChange(estadosFiltro.filter((e) => e !== estado))
    } else {
      onEstadosFiltroChange([...estadosFiltro, estado])
    }
  }

  // Count active secondary filters
  const activeFilters = [
    sector !== 'todos',
    fuente !== 'todas',
    prioridad !== 'todas',
    estadosFiltro.length > 0,
    valorMinimo > 0,
    soloSinFollowup,
    soloUrgentes,
  ].filter(Boolean).length

  function clearAll() {
    onSectorChange('todos')
    onFuenteChange('todas')
    onPrioridadChange('todas')
    onEstadosFiltroChange([])
    onValorMinimoChange(0)
    onSoloSinFollowupChange(false)
    onSoloUrgentesChange(false)
  }

  const estadosLabel = estadosFiltro.length === 0
    ? 'Estado'
    : estadosFiltro.length === 1
    ? ESTADOS_LEAD[estadosFiltro[0]].label
    : `${estadosFiltro.length} estados`

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle mis leads */}
        <div className="flex rounded-md border border-telkora-border bg-telkora-card text-xs">
          <button
            onClick={() => onSoloMiosChange(false)}
            className={`px-3 py-1.5 transition-colors ${
              !soloMios
                ? 'bg-telkora-card2 text-telkora-text'
                : 'text-telkora-muted hover:text-telkora-text'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => onSoloMiosChange(true)}
            className={`px-3 py-1.5 transition-colors ${
              soloMios
                ? 'bg-telkora-card2 text-telkora-text'
                : 'text-telkora-muted hover:text-telkora-text'
            }`}
          >
            Mis leads
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-telkora-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Empresa o contacto…"
            className="h-8 w-48 border-telkora-border bg-telkora-card pl-8 text-xs text-telkora-text placeholder:text-telkora-muted/60 focus-visible:ring-telkora-accent"
          />
        </div>

        {/* Toggle vista */}
        <div className="flex rounded-md border border-telkora-border bg-telkora-card">
          <button
            onClick={() => onVistaChange('kanban')}
            aria-label="Vista Kanban"
            className={`flex items-center px-2.5 py-1.5 transition-colors ${
              vista === 'kanban'
                ? 'bg-telkora-card2 text-telkora-text'
                : 'text-telkora-muted hover:text-telkora-text'
            }`}
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            onClick={() => onVistaChange('lista')}
            aria-label="Vista Lista"
            className={`flex items-center px-2.5 py-1.5 transition-colors ${
              vista === 'lista'
                ? 'bg-telkora-card2 text-telkora-text'
                : 'text-telkora-muted hover:text-telkora-text'
            }`}
          >
            <List className="size-3.5" />
          </button>
        </div>

        {/* Compact toggle */}
        {vista === 'kanban' && onCompactChange && (
          <button
            onClick={() => onCompactChange(!compact)}
            title={compact ? 'Vista normal' : 'Vista compacta'}
            className={`flex size-8 items-center justify-center rounded border text-xs transition-colors ${
              compact ? 'border-telkora-accent bg-telkora-accent/10 text-telkora-accent' : 'border-telkora-border text-telkora-muted hover:border-telkora-accent hover:text-telkora-accent'
            }`}
          >
            &#8861;
          </button>
        )}

        {/* More filters button */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
            showMore || activeFilters > 0
              ? 'border-telkora-accent/50 bg-telkora-card2 text-telkora-text'
              : 'border-telkora-border bg-telkora-card text-telkora-muted hover:text-telkora-text'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          {activeFilters > 0 ? `Más filtros (${activeFilters})` : 'Más filtros'}
          <ChevronDown className={`size-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-md border border-telkora-border bg-telkora-card px-2.5 py-1.5 text-xs text-telkora-muted transition-colors hover:text-telkora-danger"
          >
            <X className="size-3" />
            Limpiar
          </button>
        )}

        {/* Saved views */}
        <div className="relative" ref={presetsRef}>
          <button
            onClick={() => { setShowPresets((v) => !v); setShowGuardarVista(false) }}
            className="flex items-center gap-1.5 rounded-md border border-telkora-border bg-telkora-card px-2.5 py-1.5 text-xs text-telkora-muted transition-colors hover:text-telkora-text"
          >
            <Bookmark className="size-3.5" />
            Vistas
            <ChevronDown className="size-3" />
          </button>

          {showPresets && (
            <div className="absolute left-0 top-9 z-50 min-w-[200px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl">
              {presets.map((preset) => (
                <div key={preset.id} className="flex items-center justify-between hover:bg-telkora-card2">
                  <button
                    className="flex-1 px-3 py-2 text-left text-xs text-telkora-text"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.nombre}
                  </button>
                  {!DEFAULT_PRESETS.some((d) => d.id === preset.id) && (
                    <button
                      className="px-2 py-2 text-telkora-muted hover:text-telkora-danger"
                      onClick={() => handleDeletePreset(preset.id)}
                      aria-label="Eliminar vista"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-telkora-border">
                {showGuardarVista ? (
                  <div className="flex gap-1 p-2">
                    <input
                      value={nombrePreset}
                      onChange={(e) => setNombrePreset(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGuardarVista() }}
                      placeholder="Nombre de la vista"
                      className="flex-1 rounded border border-telkora-border bg-telkora-card2 px-2 py-1 text-xs text-telkora-text placeholder:text-telkora-muted/60 focus:outline-none focus:ring-1 focus:ring-telkora-accent"
                      autoFocus
                    />
                    <button
                      onClick={handleGuardarVista}
                      className="rounded bg-telkora-accent px-2 py-1 text-[10px] font-medium text-telkora-bg"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-telkora-muted hover:text-telkora-text"
                    onClick={() => setShowGuardarVista(true)}
                  >
                    <BookmarkPlus className="size-3.5" />
                    Guardar vista actual
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onImportar}
            className="h-8 border-telkora-border bg-telkora-card text-xs text-telkora-muted hover:bg-telkora-card2 hover:text-telkora-text"
          >
            <Upload className="mr-1.5 size-3.5" />
            Importar CSV
          </Button>
          <Button
            size="sm"
            onClick={onNuevoLead}
            className="h-8 bg-telkora-accent text-xs font-semibold text-telkora-bg hover:bg-telkora-accent2"
          >
            <Plus className="mr-1.5 size-3.5" />
            Nuevo lead
          </Button>
        </div>
      </div>

      {/* Row 2 — advanced filters */}
      {showMore && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-telkora-border bg-telkora-card/50 px-3 py-2.5">
          {/* Sector */}
          <Select value={sector} onValueChange={(v) => onSectorChange(v ?? 'todos')}>
            <SelectTrigger className="h-8 w-40 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent className="border-telkora-border bg-telkora-card">
              <SelectItem value="todos" className="text-xs text-telkora-muted">Todos los sectores</SelectItem>
              {SECTORES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs text-telkora-text">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Fuente */}
          <Select value={fuente} onValueChange={(v) => onFuenteChange(v ?? 'todas')}>
            <SelectTrigger className="h-8 w-36 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
              <SelectValue placeholder="Fuente" />
            </SelectTrigger>
            <SelectContent className="border-telkora-border bg-telkora-card">
              <SelectItem value="todas" className="text-xs text-telkora-muted">Todas las fuentes</SelectItem>
              {FUENTES.map((f) => (
                <SelectItem key={f} value={f} className="text-xs text-telkora-text">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Prioridad */}
          <Select value={prioridad} onValueChange={(v) => onPrioridadChange(v ?? 'todas')}>
            <SelectTrigger className="h-8 w-32 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent className="border-telkora-border bg-telkora-card">
              <SelectItem value="todas" className="text-xs text-telkora-muted">Todas</SelectItem>
              <SelectItem value="3" className="text-xs text-telkora-danger">Alta</SelectItem>
              <SelectItem value="2" className="text-xs text-telkora-warning">Media</SelectItem>
              <SelectItem value="1" className="text-xs text-telkora-muted">Baja</SelectItem>
            </SelectContent>
          </Select>

          {/* Estado multi-select */}
          <div className="relative" ref={estadoDropdownRef}>
            <button
              onClick={() => setShowEstadoDropdown((v) => !v)}
              className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors ${
                estadosFiltro.length > 0
                  ? 'border-telkora-accent/50 bg-telkora-card2 text-telkora-text'
                  : 'border-telkora-border bg-telkora-card text-telkora-muted hover:text-telkora-text'
              }`}
            >
              {estadosLabel}
              <ChevronDown className="size-3" />
            </button>

            {showEstadoDropdown && (
              <div className="absolute left-0 top-9 z-50 min-w-[180px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-telkora-muted hover:bg-telkora-card2"
                  onClick={() => onEstadosFiltroChange([])}
                >
                  Todos los estados
                  {estadosFiltro.length === 0 && <span className="text-telkora-accent">✓</span>}
                </button>
                <div className="border-t border-telkora-border">
                  {ESTADOS_LEAD_ORDER.map((estado) => {
                    const cfg = ESTADOS_LEAD[estado]
                    const checked = estadosFiltro.includes(estado)
                    return (
                      <button
                        key={estado}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-telkora-card2"
                        onClick={() => toggleEstado(estado)}
                      >
                        <span
                          className={`flex size-3.5 items-center justify-center rounded border ${
                            checked
                              ? 'border-telkora-accent bg-telkora-accent'
                              : 'border-telkora-border bg-transparent'
                          }`}
                        >
                          {checked && <span className="text-[8px] font-bold text-telkora-bg leading-none">✓</span>}
                        </span>
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Valor mínimo */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-telkora-muted">€</span>
            <Input
              type="number"
              min={0}
              value={valorMinimo === 0 ? '' : valorMinimo}
              onChange={(e) => onValorMinimoChange(Number(e.target.value) || 0)}
              placeholder="Valor ≥"
              className="h-8 w-28 border-telkora-border bg-telkora-card pl-6 text-xs text-telkora-text placeholder:text-telkora-muted/60 focus-visible:ring-telkora-accent"
            />
          </div>

          {/* Urgentes toggle */}
          <button
            onClick={() => onSoloUrgentesChange(!soloUrgentes)}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors ${
              soloUrgentes
                ? 'border-telkora-danger/50 bg-telkora-danger/10 text-telkora-danger'
                : 'border-telkora-border bg-telkora-card text-telkora-muted hover:text-telkora-text'
            }`}
          >
            Urgentes
          </button>

          {/* Sin follow-up toggle */}
          <button
            onClick={() => onSoloSinFollowupChange(!soloSinFollowup)}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors ${
              soloSinFollowup
                ? 'border-telkora-accent/50 bg-telkora-card2 text-telkora-text'
                : 'border-telkora-border bg-telkora-card text-telkora-muted hover:text-telkora-text'
            }`}
          >
            Sin follow-up
          </button>
        </div>
      )}
    </div>
  )
}
