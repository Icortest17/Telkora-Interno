import { createClient } from '@/lib/supabase/server'
import { getPerfil, getUsuarios } from '@/lib/profile'
import Link from 'next/link'
import { formatEUR, formatDate, isFollowupUrgente } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AlertTriangle, TrendingUp, Users, BarChart2, FolderKanban, Target, Kanban } from 'lucide-react'
import type { Lead, EstadoLead } from '@/types'
import { ESTADOS_LEAD, ESTADOS_PIPELINE } from '@/lib/constants'
import { differenceInDays } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()
  const esSocio = perfil?.rol === 'socio'
  const userId = perfil?.userId ?? ''

  let leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false })
  if (esSocio) leadsQuery = leadsQuery.eq('owner_id', userId) as typeof leadsQuery

  let proyQuery = supabase.from('proyectos').select('id, estado').not('estado', 'in', '("entregado","cancelado","pausado")')
  if (esSocio) proyQuery = proyQuery.eq('owner_id', userId) as typeof proyQuery

  const [leadsRes, clientesRes, proyectosRes] = await Promise.all([
    leadsQuery,
    // MRR solo visible para admin
    esSocio
      ? Promise.resolve({ data: [] })
      : supabase.from('clientes').select('mrr, estado').eq('estado', 'activo'),
    proyQuery,
  ])

  const leads: Lead[] = leadsRes.data ?? []
  const clientes = clientesRes.data ?? []
  const proyectosActivos = proyectosRes.data?.length ?? 0

  // Métricas
  const leadsActivos = leads.filter(
    (l) => !['cerrado_ganado', 'cerrado_perdido', 'pausado'].includes(l.estado)
  ).length

  const mrrActual = clientes.reduce((s, c) => s + (c.mrr ?? 0), 0)

  const valorPipeline = leads
    .filter((l) => (ESTADOS_PIPELINE as string[]).includes(l.estado))
    .reduce((s, l) => s + (l.valor_ponderado ?? 0), 0)

  // Leads urgentes
  const urgentes = leads
    .filter(
      (l) =>
        !['cerrado_ganado', 'cerrado_perdido'].includes(l.estado) &&
        isFollowupUrgente(l.proximo_followup)
    )
    .slice(0, 5)

  // Pipeline por estado
  const pipelineStats = (Object.entries(
    leads.reduce<Record<string, { count: number; valor: number }>>((acc, l) => {
      if (!acc[l.estado]) acc[l.estado] = { count: 0, valor: 0 }
      acc[l.estado].count++
      acc[l.estado].valor += l.valor_estimado ?? 0
      return acc
    }, {})
  ) as [EstadoLead, { count: number; valor: number }][]).sort(
    (a, b) =>
      (Object.keys(ESTADOS_LEAD).indexOf(a[0]) ?? 99) -
      (Object.keys(ESTADOS_LEAD).indexOf(b[0]) ?? 99)
  )

  // Metas del mes
  const mesActual = (() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })()

  const { data: metasData } = await supabase
    .from('metas')
    .select('tipo, objetivo')
    .eq('user_id', userId)
    .eq('mes', mesActual)

  const metas = {
    leads_cerrados: (metasData ?? []).find((m) => m.tipo === 'leads_cerrados')?.objetivo ?? 0,
    pipeline_valor: (metasData ?? []).find((m) => m.tipo === 'pipeline_valor')?.objetivo ?? 0,
    ingresos: (metasData ?? []).find((m) => m.tipo === 'ingresos')?.objetivo ?? 0,
  }

  // Ingresos del mes actual
  let ingresosQuery = supabase
    .from('transacciones')
    .select('importe, estado, tipo')
    .eq('tipo', 'ingreso')
    .eq('estado', 'cobrada')
    .gte('fecha_cobro', mesActual)
  if (esSocio) ingresosQuery = ingresosQuery.eq('owner_id', userId) as typeof ingresosQuery
  const { data: ingresosData } = await ingresosQuery
  const ingresosMes = (ingresosData ?? []).reduce((s, t) => s + t.importe, 0)

  // Métricas de conversión
  const totalLeads = leads.length
  const leadsCerradosGanados = leads.filter((l) => l.estado === 'cerrado_ganado')
  const tasaConversion = totalLeads > 0 ? (leadsCerradosGanados.length / totalLeads) * 100 : 0
  const valorMedioDeal = leadsCerradosGanados.length > 0
    ? leadsCerradosGanados.reduce((s, l) => s + (l.valor_estimado ?? 0), 0) / leadsCerradosGanados.length
    : 0

  const leadsActivosPipeline = leads.filter((l) => (ESTADOS_PIPELINE as string[]).includes(l.estado))
  const tiempoMedioPipeline = leadsActivosPipeline.length > 0
    ? Math.round(
        leadsActivosPipeline
          .filter((l) => l.fecha_primer_contacto)
          .reduce((s, l) => s + differenceInDays(new Date(), new Date(l.fecha_primer_contacto!)), 0) /
          leadsActivosPipeline.filter((l) => l.fecha_primer_contacto).length || 0
      )
    : 0

  // Embudo pipeline activo (solo estados pipeline)
  const embudoStats = (ESTADOS_PIPELINE as EstadoLead[]).map((estado) => {
    const count = leads.filter((l) => l.estado === estado).length
    return { estado, count }
  })
  const maxEmbudoCount = Math.max(...embudoStats.map((s) => s.count), 1)

  // Obtener lista de usuarios para comparativa admin
  const usuarios = esSocio ? [] : await getUsuarios()

  // Métricas por usuario (solo admin)
  const metricasPorUsuario = esSocio ? [] : await Promise.all(
    usuarios.map(async (u) => {
      const [leadsRes, proyRes, txRes] = await Promise.all([
        supabase.from('leads').select('estado, valor_estimado, valor_ponderado').eq('owner_id', u.userId),
        supabase.from('proyectos').select('estado').eq('owner_id', u.userId).not('estado', 'in', '("entregado","cancelado","pausado")'),
        supabase.from('transacciones').select('tipo, importe, estado').eq('owner_id', u.userId),
      ])
      const leadsData = leadsRes.data ?? []
      const leadsActivos = leadsData.filter(l => !['cerrado_ganado', 'cerrado_perdido', 'pausado'].includes(l.estado)).length
      const leadsCerrados = leadsData.filter(l => l.estado === 'cerrado_ganado').length
      const valorPipeline = leadsData.filter(l => (ESTADOS_PIPELINE as string[]).includes(l.estado)).reduce((s, l) => s + (l.valor_ponderado ?? 0), 0)
      const proyectosActivos = proyRes.data?.length ?? 0
      const txData = txRes.data ?? []
      const ingresosMes = txData.filter(t => t.tipo === 'ingreso' && t.estado === 'cobrada').reduce((s, t) => s + t.importe, 0)
      return { ...u, leadsActivos, leadsCerrados, valorPipeline, proyectosActivos, ingresosMes }
    })
  )

  const METRICAS = [
    { label: 'Mis leads activos', value: leadsActivos, icon: Users, accent: false },
    ...(esSocio ? [] : [{ label: 'MRR actual', value: formatEUR(mrrActual), icon: TrendingUp, accent: true }]),
    { label: 'Mi pipeline', value: formatEUR(valorPipeline), icon: BarChart2, accent: false },
    { label: esSocio ? 'Mis proyectos' : 'Proyectos activos', value: proyectosActivos, icon: FolderKanban, accent: false },
  ]

  return (
    <div className="space-y-6">
      {/* Métricas superiores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICAS.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl border border-telkora-border bg-telkora-card p-5"
          >
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-telkora-muted" />
              <p className="text-xs text-telkora-muted">{label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${accent ? 'text-telkora-accent' : 'text-telkora-text'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-telkora-border bg-telkora-card p-12 text-center">
          <div className="rounded-full bg-telkora-card2 p-4">
            <Kanban className="size-8 text-telkora-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-telkora-text">Bienvenido a Telkora</h2>
            <p className="mt-1 text-sm text-telkora-muted">
              Aún no tienes leads. Empieza creando tu primer prospecto o importa un CSV.
            </p>
          </div>
          <Link
            href="/leads"
            className="rounded-lg bg-telkora-accent px-4 py-2 text-sm font-medium text-telkora-bg hover:opacity-90"
          >
            Ir al Pipeline →
          </Link>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Leads urgentes */}
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-telkora-danger" />
              <h2 className="text-sm font-semibold text-telkora-text">Follow-ups urgentes</h2>
              {urgentes.length > 0 && (
                <span className="rounded-full bg-telkora-danger/20 px-2 py-0.5 text-xs font-medium text-telkora-danger">
                  {urgentes.length}
                </span>
              )}
            </div>
            <Link href="/leads" className="text-xs text-telkora-muted hover:text-telkora-accent">
              Ver todos →
            </Link>
          </div>

          {urgentes.length === 0 ? (
            <p className="py-4 text-center text-xs text-telkora-muted">Sin follow-ups urgentes 🎉</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-telkora-border">
                  <th className="pb-2 text-left text-telkora-muted">Empresa</th>
                  <th className="pb-2 text-left text-telkora-muted">Estado</th>
                  <th className="pb-2 text-left text-telkora-muted">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {urgentes.map((l) => (
                  <tr key={l.id} className="border-b border-telkora-border/50">
                    <td className="py-2">
                      <Link
                        href={`/leads/${l.id}`}
                        className="text-telkora-text hover:text-telkora-accent"
                      >
                        {l.empresa}
                      </Link>
                    </td>
                    <td className="py-2">
                      <StatusBadge estado={l.estado} />
                    </td>
                    <td className="py-2 text-telkora-danger">
                      {formatDate(l.proximo_followup)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Pipeline en números */}
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Pipeline en números</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-telkora-border">
                <th className="pb-2 text-left text-telkora-muted">Estado</th>
                <th className="pb-2 text-right text-telkora-muted">Leads</th>
                <th className="pb-2 text-right text-telkora-muted">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pipelineStats.map(([estado, stats]) => (
                <tr key={estado} className="border-b border-telkora-border/50">
                  <td className="py-2">
                    <StatusBadge estado={estado as EstadoLead} />
                  </td>
                  <td className="py-2 text-right text-telkora-text">{stats.count}</td>
                  <td className="py-2 text-right text-telkora-muted">{formatEUR(stats.valor)}</td>
                </tr>
              ))}
              <tr className="border-t border-telkora-border">
                <td className="py-2 font-medium text-telkora-text">Total</td>
                <td className="py-2 text-right font-medium text-telkora-text">{leads.length}</td>
                <td className="py-2 text-right font-medium text-telkora-accent">
                  {formatEUR(leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Embudo de conversión */}
      <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-telkora-text">Embudo de conversión</h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Barras del funnel */}
          <div className="space-y-3">
            {embudoStats.map(({ estado, count }) => {
              const pct = maxEmbudoCount > 0 ? Math.round((count / maxEmbudoCount) * 100) : 0
              const cfg = ESTADOS_LEAD[estado]
              return (
                <div key={estado}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-telkora-muted">{cfg.label}</span>
                    <span className="font-medium text-telkora-text">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-telkora-card2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Métricas clave */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-lg border border-telkora-border bg-telkora-card2 p-3">
              <p className="text-[11px] text-telkora-muted">Tasa de conversión</p>
              <p className="mt-1 text-xl font-bold text-telkora-accent">
                {tasaConversion.toFixed(1)}%
              </p>
              <p className="text-[10px] text-telkora-muted">{leadsCerradosGanados.length} de {totalLeads} leads</p>
            </div>
            <div className="rounded-lg border border-telkora-border bg-telkora-card2 p-3">
              <p className="text-[11px] text-telkora-muted">Valor medio deal</p>
              <p className="mt-1 text-xl font-bold text-telkora-text">
                {formatEUR(valorMedioDeal)}
              </p>
              <p className="text-[10px] text-telkora-muted">Leads cerrados ganados</p>
            </div>
            <div className="rounded-lg border border-telkora-border bg-telkora-card2 p-3">
              <p className="text-[11px] text-telkora-muted">Tiempo en pipeline</p>
              <p className="mt-1 text-xl font-bold text-telkora-text">
                {tiempoMedioPipeline}d
              </p>
              <p className="text-[10px] text-telkora-muted">Promedio leads activos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Progreso hacia metas */}
      {(metas.leads_cerrados > 0 || metas.pipeline_valor > 0 || metas.ingresos > 0) && (
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-telkora-accent" />
              <h2 className="text-sm font-semibold text-telkora-text">Progreso hacia metas</h2>
            </div>
            <Link href="/ajustes" className="text-xs text-telkora-muted hover:text-telkora-accent">
              Editar metas →
            </Link>
          </div>
          <div className="space-y-4">
            {metas.leads_cerrados > 0 && (() => {
              const actual = leadsCerradosGanados.length
              const pct = Math.min(Math.round((actual / metas.leads_cerrados) * 100), 100)
              return (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-telkora-muted">Leads cerrados</span>
                    <span className="font-medium text-telkora-text">
                      {actual} / {metas.leads_cerrados} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-telkora-card2">
                    <div
                      className="h-full rounded-full bg-telkora-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}
            {metas.pipeline_valor > 0 && (() => {
              const actual = valorPipeline
              const pct = Math.min(Math.round((actual / metas.pipeline_valor) * 100), 100)
              return (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-telkora-muted">Pipeline activo</span>
                    <span className="font-medium text-telkora-text">
                      {formatEUR(actual)} / {formatEUR(metas.pipeline_valor)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-telkora-card2">
                    <div
                      className="h-full rounded-full bg-telkora-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}
            {metas.ingresos > 0 && (() => {
              const actual = ingresosMes
              const pct = Math.min(Math.round((actual / metas.ingresos) * 100), 100)
              return (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-telkora-muted">Ingresos del mes</span>
                    <span className="font-medium text-telkora-text">
                      {formatEUR(actual)} / {formatEUR(metas.ingresos)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-telkora-card2">
                    <div
                      className="h-full rounded-full bg-telkora-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* Comparativa por socio — solo admin */}
      {!esSocio && metricasPorUsuario.length > 0 && (
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Comparativa por socio</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-telkora-border">
                  <th className="pb-2 text-left text-telkora-muted">Socio</th>
                  <th className="pb-2 text-right text-telkora-muted">Leads activos</th>
                  <th className="pb-2 text-right text-telkora-muted">Cerrados ganados</th>
                  <th className="pb-2 text-right text-telkora-muted">Pipeline</th>
                  <th className="pb-2 text-right text-telkora-muted">Proyectos</th>
                  <th className="pb-2 text-right text-telkora-muted">Facturado</th>
                </tr>
              </thead>
              <tbody>
                {metricasPorUsuario.map((u) => (
                  <tr key={u.userId} className="border-b border-telkora-border/50">
                    <td className="py-2 font-medium text-telkora-text">{u.nombre}</td>
                    <td className="py-2 text-right text-telkora-text">{u.leadsActivos}</td>
                    <td className="py-2 text-right text-telkora-accent">{u.leadsCerrados}</td>
                    <td className="py-2 text-right text-telkora-text">{formatEUR(u.valorPipeline)}</td>
                    <td className="py-2 text-right text-telkora-text">{u.proyectosActivos}</td>
                    <td className="py-2 text-right text-telkora-text">{formatEUR(u.ingresosMes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-telkora-border">
                  <td className="py-2 font-medium text-telkora-text">Total</td>
                  <td className="py-2 text-right font-medium text-telkora-text">
                    {metricasPorUsuario.reduce((s, u) => s + u.leadsActivos, 0)}
                  </td>
                  <td className="py-2 text-right font-medium text-telkora-accent">
                    {metricasPorUsuario.reduce((s, u) => s + u.leadsCerrados, 0)}
                  </td>
                  <td className="py-2 text-right font-medium text-telkora-text">
                    {formatEUR(metricasPorUsuario.reduce((s, u) => s + u.valorPipeline, 0))}
                  </td>
                  <td className="py-2 text-right font-medium text-telkora-text">
                    {metricasPorUsuario.reduce((s, u) => s + u.proyectosActivos, 0)}
                  </td>
                  <td className="py-2 text-right font-medium text-telkora-accent">
                    {formatEUR(metricasPorUsuario.reduce((s, u) => s + u.ingresosMes, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
      </>
      )}
    </div>
  )
}
