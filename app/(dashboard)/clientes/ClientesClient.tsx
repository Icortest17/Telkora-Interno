'use client'

import { useState, useMemo } from 'react'
import { ClienteCard } from '@/components/clientes/ClienteCard'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus } from 'lucide-react'
import type { Cliente } from '@/types'

interface Props {
  initialClientes: Cliente[]
}

export function ClientesClient({ initialClientes }: Props) {
  const [clientes] = useState<Cliente[]>(initialClientes)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [tierFilter, setTierFilter] = useState('todos')
  const [ordenar, setOrdenar] = useState('mrr')

  const filtered = useMemo(() => {
    return clientes
      .filter((c) => {
        if (estadoFilter !== 'todos' && c.estado !== estadoFilter) return false
        if (tierFilter !== 'todos' && c.tier !== tierFilter) return false
        return true
      })
      .sort((a, b) => {
        if (ordenar === 'mrr') return b.mrr - a.mrr
        if (ordenar === 'nombre') return a.empresa.localeCompare(b.empresa)
        if (ordenar === 'inicio') return (b.fecha_inicio_relacion ?? '').localeCompare(a.fecha_inicio_relacion ?? '')
        return 0
      })
  }, [clientes, estadoFilter, tierFilter, ordenar])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v ?? 'todos')}>
          <SelectTrigger className="h-8 w-36 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="border-telkora-border bg-telkora-card">
            <SelectItem value="todos" className="text-xs text-telkora-muted">Todos</SelectItem>
            <SelectItem value="activo" className="text-xs text-telkora-text">Activo</SelectItem>
            <SelectItem value="pausado" className="text-xs text-telkora-text">Pausado</SelectItem>
            <SelectItem value="churned" className="text-xs text-telkora-text">Churned</SelectItem>
            <SelectItem value="upsell" className="text-xs text-telkora-text">Upsell</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v ?? 'todos')}>
          <SelectTrigger className="h-8 w-32 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="border-telkora-border bg-telkora-card">
            <SelectItem value="todos" className="text-xs text-telkora-muted">Todos</SelectItem>
            <SelectItem value="gold" className="text-xs" style={{ color: '#FFD700' }}>Gold</SelectItem>
            <SelectItem value="silver" className="text-xs" style={{ color: '#C0C0C0' }}>Silver</SelectItem>
            <SelectItem value="bronze" className="text-xs" style={{ color: '#CD7F32' }}>Bronze</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ordenar} onValueChange={(v) => setOrdenar(v ?? 'mrr')}>
          <SelectTrigger className="h-8 w-40 border-telkora-border bg-telkora-card text-xs text-telkora-muted focus:ring-telkora-accent">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent className="border-telkora-border bg-telkora-card">
            <SelectItem value="mrr" className="text-xs text-telkora-text">MRR (mayor a menor)</SelectItem>
            <SelectItem value="nombre" className="text-xs text-telkora-text">Nombre</SelectItem>
            <SelectItem value="inicio" className="text-xs text-telkora-text">Fecha de inicio</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            size="sm"
            className="h-8 bg-telkora-accent text-xs font-semibold text-telkora-bg hover:bg-telkora-accent2"
          >
            <Plus className="mr-1.5 size-3.5" />
            Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState title="Sin clientes" description="Convierte leads o crea clientes manualmente." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <ClienteCard key={c.id} cliente={c} />
          ))}
        </div>
      )}
    </div>
  )
}
