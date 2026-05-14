'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Upload } from 'lucide-react'
import { SECTORES, FUENTES } from '@/lib/constants'

interface LeadFiltersProps {
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
  onNuevoLead: () => void
  onImportar: () => void
}

export function LeadFilters({
  search, onSearchChange,
  sector, onSectorChange,
  fuente, onFuenteChange,
  prioridad, onPrioridadChange,
  soloMios, onSoloMiosChange,
  onNuevoLead, onImportar,
}: LeadFiltersProps) {
  return (
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
        <SelectTrigger className="h-8 w-36 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent className="border-telkora-border bg-telkora-card">
          <SelectItem value="todas" className="text-xs text-telkora-muted">Todas</SelectItem>
          <SelectItem value="3" className="text-xs text-telkora-danger">Alta</SelectItem>
          <SelectItem value="2" className="text-xs text-telkora-warning">Media</SelectItem>
          <SelectItem value="1" className="text-xs text-telkora-muted">Baja</SelectItem>
        </SelectContent>
      </Select>

      {/* Acciones */}
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
  )
}
