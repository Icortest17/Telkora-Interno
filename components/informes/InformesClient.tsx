'use client'

import { useState, useMemo } from 'react'
import { BarChart2, TrendingUp, Globe, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatEUR } from '@/lib/utils'
import { ESTADOS_LEAD } from '@/lib/constants'
import type { EstadoLead } from '@/types'

interface LeadRow {
  id: string
  empresa: string
  estado: EstadoLead
  valor_estimado: number
  valor_ponderado: number
  fuente: string | null
  sector: string | null
  owner_id: string | null
  created_at: string
  fecha_primer_contacto: string | null
  updated_at: string
  proximo_followup: string | null
}

interface ClienteRow {
  id: string
  estado: string
  mrr: number
  tier: string
}

interface UsuarioRow {
  userId: string
  nombre: string
}

interface Props {
  leads: LeadRow[]
  clientes: ClienteRow[]
  usuarios: UsuarioRow[]
}

type Tab = 'pipeline' | 'conversion' | 'fuentes' | 'equipo'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pipeline',   label: 'Pipeline',    icon: BarChart2 },
  { id: 'conversion', label: 'Conversión',  icon: TrendingUp },
  { id: 'fuentes',    label: 'Fuentes',     icon: Globe },
  { id: 'equipo',     label: 'Equipo',      icon: Users },
]

const FUNNEL_ORDER: EstadoLead[] = [
  'prospecto', 'contactado', 'reunion', 'propuesta', 'negociacion', 'cerrado_ganado',
]

const FUENTE_COLORS = [
  '#00FF88', '#6677FF', '#FF9900', '#FF4466', '#00CCFF',
  '#AA77FF', '#FFD700', '#88CC88', '#FF8C00', '#4A9EFF',
]

export function InformesClient({ leads, clientes, usuarios }: Props) {
  const [tab, setTab] = useState<Tab>('pipeline')

  // ── Pipeline KPIs ──────────────────────────────────────────
  const activosStates: EstadoLead[] = ['prospecto', 'contactado', 'reunion', 'propuesta', 'negociacion']
  const leadsActivos = useMemo(
    () => leads.filter((l) => activosStates.includes(l.estado)),
    [leads]
  )
  const valorPipeline = useMemo(
    () => leadsActivos.reduce((acc, l) => acc + (l.valor_estimado ?? 0), 0),
    [leadsActivos]
  )
  const valorPonderado = useMemo(
    () => leadsActivos.reduce((acc, l) => acc + (l.valor_ponderado ?? 0), 0),
    [leadsActivos]
  )
  const mesActual = new Date().toISOString().slice(0, 7) // YYYY-MM
  const cerradosEsteMes = useMemo(
    () => leads.filter((l) => l.estado === 'cerrado_ganado' && l.updated_at.startsWith(mesActual)).length,
    [leads, mesActual]
  )

  // ── Bar chart: valor per estado ────────────────────────────
  const valorPorEstado = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of leads) {
      map[l.estado] = (map[l.estado] ?? 0) + (l.valor_estimado ?? 0)
    }
    return map
  }, [leads])

  const maxValorEstado = Math.max(1, ...Object.values(valorPorEstado))

  // ── Top 10 por valor ───────────────────────────────────────
  const top10 = useMemo(
    () => [...leads].sort((a, b) => b.valor_estimado - a.valor_estimado).slice(0, 10),
    [leads]
  )

  // ── Conversion funnel ──────────────────────────────────────
  const funnelData = useMemo(() => {
    return FUNNEL_ORDER.map((estado, i) => {
      const count = leads.filter((l) => l.estado === estado).length
      const prev = i === 0 ? leads.length : leads.filter((l) => l.estado === FUNNEL_ORDER[i - 1]).length
      const pct = prev > 0 ? Math.round((count / prev) * 100) : 0
      const valor = leads.filter((l) => l.estado === estado).reduce((a, l) => a + (l.valor_estimado ?? 0), 0)
      return { estado, count, pct, valor }
    })
  }, [leads])

  const totalLeads = leads.length
  const totalGanados = leads.filter((l) => l.estado === 'cerrado_ganado').length
  const tasaConversion = totalLeads > 0 ? ((totalGanados / totalLeads) * 100).toFixed(1) : '0.0'

  const tiempoMedioDias = useMemo(() => {
    const ganados = leads.filter((l) => l.estado === 'cerrado_ganado')
    if (ganados.length === 0) return 0
    const total = ganados.reduce((acc, l) => {
      const diff = new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()
      return acc + diff / 86400000
    }, 0)
    return Math.round(total / ganados.length)
  }, [leads])

  // ── Fuentes ────────────────────────────────────────────────
  const fuentesData = useMemo(() => {
    const map: Record<string, { total: number; ganados: number }> = {}
    for (const l of leads) {
      const f = l.fuente ?? 'Sin fuente'
      if (!map[f]) map[f] = { total: 0, ganados: 0 }
      map[f].total++
      if (l.estado === 'cerrado_ganado') map[f].ganados++
    }
    return Object.entries(map)
      .map(([fuente, data]) => ({
        fuente,
        ...data,
        pct: data.total > 0 ? Math.round((data.ganados / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [leads])

  const maxFuente = Math.max(1, ...fuentesData.map((f) => f.total))

  // ── Equipo ─────────────────────────────────────────────────
  const equipoData = useMemo(() => {
    return usuarios.map((u) => {
      const propios = leads.filter((l) => l.owner_id === u.userId)
      const activos = propios.filter((l) => activosStates.includes(l.estado)).length
      const cerrados = propios.filter((l) => l.estado === 'cerrado_ganado').length
      const pipeline = propios.filter((l) => activosStates.includes(l.estado)).reduce((a, l) => a + (l.valor_estimado ?? 0), 0)
      const hoy = new Date()
      const urgentes = propios.filter((l) => {
        if (!l.proximo_followup) return false
        return new Date(l.proximo_followup) <= hoy
      }).length
      return { ...u, activos, cerrados, pipeline, urgentes }
    })
  }, [leads, usuarios])

  const tabCls = (id: Tab) =>
    cn(
      'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
      tab === id
        ? 'bg-telkora-card2 text-telkora-text font-medium border border-telkora-border'
        : 'text-telkora-muted hover:bg-telkora-card2 hover:text-telkora-text'
    )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.filter((t) => t.id !== 'equipo' || usuarios.length > 1).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={tabCls(id)}>
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE ── */}
      {tab === 'pipeline' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Leads activos', value: leadsActivos.length.toString() },
              { label: 'Valor pipeline', value: formatEUR(valorPipeline) },
              { label: 'Valor ponderado', value: formatEUR(valorPonderado) },
              { label: 'Cerrados este mes', value: cerradosEsteMes.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-telkora-border bg-telkora-card p-4">
                <p className="text-xs text-telkora-muted">{label}</p>
                <p className="mt-1 text-xl font-bold text-telkora-accent">{value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart: valor por estado */}
          <div className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-telkora-text">Valor estimado por estado</h2>
            <div className="space-y-2.5">
              {Object.entries(ESTADOS_LEAD).map(([estado, { label }]) => {
                const valor = valorPorEstado[estado] ?? 0
                const width = Math.round((valor / maxValorEstado) * 100)
                return (
                  <div key={estado} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-right text-xs text-telkora-muted">{label}</span>
                    <div className="h-5 flex-1 rounded-full bg-telkora-card2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-telkora-accent transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-24 text-xs text-telkora-text">{formatEUR(valor)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 10 leads */}
          <div className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-telkora-text">Top 10 leads por valor estimado</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-telkora-border text-left text-telkora-muted">
                    <th className="pb-2 pr-4 font-medium">Empresa</th>
                    <th className="pb-2 pr-4 font-medium">Estado</th>
                    <th className="pb-2 pr-4 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-telkora-border/50">
                  {top10.map((l) => {
                    const owner = usuarios.find((u) => u.userId === l.owner_id)
                    return (
                      <tr key={l.id}>
                        <td className="py-2 pr-4 font-medium text-telkora-text">{l.empresa}</td>
                        <td className="py-2 pr-4 text-telkora-muted">
                          {ESTADOS_LEAD[l.estado]?.label ?? l.estado}
                        </td>
                        <td className="py-2 pr-4 text-right text-telkora-accent">{formatEUR(l.valor_estimado)}</td>
                        <td className="py-2 text-telkora-muted">{owner?.nombre ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONVERSION ── */}
      {tab === 'conversion' && (
        <div className="space-y-6">
          {/* Global stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-telkora-border bg-telkora-card p-4">
              <p className="text-xs text-telkora-muted">Tasa de conversión global</p>
              <p className="mt-1 text-2xl font-bold text-telkora-accent">{tasaConversion}%</p>
            </div>
            <div className="rounded-xl border border-telkora-border bg-telkora-card p-4">
              <p className="text-xs text-telkora-muted">Tiempo medio en pipeline</p>
              <p className="mt-1 text-2xl font-bold text-telkora-text">{tiempoMedioDias} días</p>
            </div>
            <div className="rounded-xl border border-telkora-border bg-telkora-card p-4">
              <p className="text-xs text-telkora-muted">Total leads</p>
              <p className="mt-1 text-2xl font-bold text-telkora-text">{totalLeads}</p>
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-5 text-sm font-semibold text-telkora-text">Embudo de conversión</h2>
            <div className="space-y-2">
              {funnelData.map(({ estado, count, pct, valor }, i) => {
                const maxCount = funnelData[0]?.count ?? 1
                const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                return (
                  <div key={estado} className="flex items-center gap-4">
                    <span className="w-32 shrink-0 text-right text-xs text-telkora-muted">
                      {ESTADOS_LEAD[estado]?.label ?? estado}
                    </span>
                    <div className="flex-1">
                      <div className="h-7 overflow-hidden rounded-md bg-telkora-card2">
                        <div
                          className="flex h-full items-center px-3 text-xs font-medium text-telkora-bg transition-all duration-500"
                          style={{
                            width: `${Math.max(barWidth, 8)}%`,
                            background: `hsl(${140 - i * 20}, 70%, 45%)`,
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                    <div className="w-32 shrink-0 text-xs text-telkora-muted">
                      <span className="text-telkora-text font-medium">{pct}%</span>
                      {' '}&nbsp;{formatEUR(valor)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FUENTES ── */}
      {tab === 'fuentes' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-5 text-sm font-semibold text-telkora-text">Leads por fuente</h2>
            <div className="space-y-3">
              {fuentesData.map(({ fuente, total, ganados, pct }, i) => (
                <div key={fuente} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-telkora-text">{fuente}</span>
                    <span className="text-telkora-muted">
                      {total} leads &middot; {ganados} ganados &middot;{' '}
                      <span className="text-telkora-accent font-medium">{pct}% conv.</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-telkora-card2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((total / maxFuente) * 100)}%`,
                        background: FUENTE_COLORS[i % FUENTE_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EQUIPO ── */}
      {tab === 'equipo' && usuarios.length > 1 && (
        <div className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Rendimiento por comercial</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-telkora-border text-left text-telkora-muted">
                  <th className="pb-2 pr-4 font-medium">Comercial</th>
                  <th className="pb-2 pr-4 font-medium text-right">Leads activos</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cerrados</th>
                  <th className="pb-2 pr-4 font-medium text-right">Pipeline</th>
                  <th className="pb-2 font-medium text-right">Urgentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-telkora-border/50">
                {equipoData.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-2 pr-4 font-medium text-telkora-text">{u.nombre}</td>
                    <td className="py-2 pr-4 text-right text-telkora-text">{u.activos}</td>
                    <td className="py-2 pr-4 text-right text-green-400">{u.cerrados}</td>
                    <td className="py-2 pr-4 text-right text-telkora-accent">{formatEUR(u.pipeline)}</td>
                    <td className="py-2 text-right">
                      {u.urgentes > 0 ? (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">{u.urgentes}</span>
                      ) : (
                        <span className="text-telkora-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
