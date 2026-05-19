'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClienteCard } from '@/components/clientes/ClienteCard'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { SECTORES } from '@/lib/constants'
import type { Cliente } from '@/types'

interface Props {
  initialClientes: Cliente[]
}

interface NuevoClienteForm {
  empresa: string
  contacto: string
  email: string
  telefono: string
  sector: string
  estado: 'activo' | 'pausado' | 'churned' | 'upsell'
  mrr: number
}

const FORM_INITIAL: NuevoClienteForm = {
  empresa: '',
  contacto: '',
  email: '',
  telefono: '',
  sector: '',
  estado: 'activo',
  mrr: 0,
}

export function ClientesClient({ initialClientes }: Props) {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [tierFilter, setTierFilter] = useState('todos')
  const [ordenar, setOrdenar] = useState('mrr')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NuevoClienteForm>(FORM_INITIAL)
  const [saving, setSaving] = useState(false)

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

  async function handleCrearCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.empresa.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          empresa: form.empresa.trim(),
          contacto: form.contacto.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          sector: form.sector || null,
          estado: form.estado,
          mrr: form.mrr,
          pais: 'España',
        })
        .select()
        .single()
      if (error) throw error
      setClientes((prev) => [data, ...prev])
      toast.success(`Cliente "${data.empresa}" creado`)
      setModalOpen(false)
      setForm(FORM_INITIAL)
    } catch (err) {
      console.error('[crear cliente]', err)
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`Error creando cliente: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-telkora-border bg-telkora-bg px-3 py-2 text-sm text-telkora-text placeholder:text-telkora-muted focus:outline-none focus:border-telkora-accent'
  const labelCls = 'block text-xs font-medium text-telkora-muted mb-1'

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
            onClick={() => setModalOpen(true)}
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

      {/* Modal: Nuevo cliente */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-md rounded-2xl border border-telkora-border bg-telkora-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-telkora-text">Nuevo cliente</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-telkora-muted hover:text-telkora-text transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCrearCliente} className="space-y-3">
              <div>
                <label className={labelCls}>Empresa *</label>
                <input
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  placeholder="Nombre de la empresa"
                  required
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contacto</label>
                  <input
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    placeholder="Nombre contacto"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@empresa.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+34 600 000 000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sector</label>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Seleccionar</option>
                    {SECTORES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as NuevoClienteForm['estado'] })}
                    className={inputCls}
                  >
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                    <option value="churned">Churned</option>
                    <option value="upsell">Upsell</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tier</label>
                  <div className={`${inputCls} bg-telkora-card2/50 text-telkora-muted cursor-default`}>
                    Auto (según MRR)
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>MRR (€/mes)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={form.mrr}
                  onChange={(e) => setForm({ ...form, mrr: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border-telkora-border text-telkora-muted hover:text-telkora-text"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !form.empresa.trim()}
                  className="flex-1 bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2 font-semibold"
                >
                  {saving ? 'Creando…' : 'Crear cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
