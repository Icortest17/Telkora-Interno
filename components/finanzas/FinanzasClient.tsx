'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Plus, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransaccionForm } from './TransaccionForm'
import { formatEUR, formatDate } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Transaccion, Cliente } from '@/types'

interface FinanzasClientProps {
  transacciones: Transaccion[]
  clientes: Pick<Cliente, 'id' | 'empresa'>[]
  mrrActual: number
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: '#FFD700',
  enviada:   '#4A9EFF',
  cobrada:   '#00CC6A',
  vencida:   '#FF4444',
}

export function FinanzasClient({ transacciones: initialTx, clientes, mrrActual }: FinanzasClientProps) {
  const supabase = createClient()
  const [transacciones, setTransacciones] = useState<Transaccion[]>(initialTx)
  const [showForm, setShowForm] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // KPIs del mes actual
  const hoy = new Date()
  const inicioMes = startOfMonth(hoy)
  const finMes = endOfMonth(hoy)

  const kpis = useMemo(() => {
    const delMes = transacciones.filter((t) => {
      const fecha = t.fecha_cobro ? new Date(t.fecha_cobro) : new Date(t.created_at)
      return fecha >= inicioMes && fecha <= finMes
    })
    const ingresosMes = delMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.importe, 0)
    const gastosMes = delMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.importe, 0)
    const pendienteCobro = transacciones
      .filter((t) => t.tipo === 'ingreso' && ['pendiente', 'enviada'].includes(t.estado))
      .reduce((s, t) => s + t.importe, 0)
    return { ingresosMes, gastosMes, beneficioMes: ingresosMes - gastosMes, pendienteCobro }
  }, [transacciones, inicioMes, finMes])

  // Datos gráfico últimos 6 meses
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(hoy, 5 - i)
      const inicio = startOfMonth(mes)
      const fin = endOfMonth(mes)
      const delMes = transacciones.filter((t) => {
        const fecha = t.fecha_cobro ? new Date(t.fecha_cobro) : new Date(t.created_at)
        return fecha >= inicio && fecha <= fin
      })
      return {
        mes: format(mes, 'MMM yy', { locale: es }),
        ingresos: delMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.importe, 0),
        gastos: delMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.importe, 0),
      }
    })
  }, [transacciones])

  // Tabla filtrada
  const txFiltradas = useMemo(() => {
    return transacciones.filter((t) => {
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
      if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
      return true
    })
  }, [transacciones, filtroTipo, filtroEstado])

  async function handleCreateTransaccion(data: Partial<Transaccion>) {
    const { data: nueva, error } = await supabase
      .from('transacciones')
      .insert(data)
      .select()
      .single()
    if (error) { toast.error('Error creando transacción'); return }
    setTransacciones((prev) => [nueva, ...prev])
    toast.success('Transacción añadida')
    setShowForm(false)
  }

  const KPI_CARDS = [
    { label: 'MRR Actual', value: formatEUR(mrrActual), icon: Activity, color: 'text-telkora-accent' },
    { label: 'Ingresos este mes', value: formatEUR(kpis.ingresosMes), icon: TrendingUp, color: 'text-green-400' },
    { label: 'Gastos este mes', value: formatEUR(kpis.gastosMes), icon: TrendingDown, color: 'text-red-400' },
    { label: 'Beneficio neto', value: formatEUR(kpis.beneficioMes), icon: DollarSign, color: kpis.beneficioMes >= 0 ? 'text-telkora-accent' : 'text-telkora-danger' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-telkora-muted" />
              <p className="text-xs text-telkora-muted">{label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pending to collect */}
      {kpis.pendienteCobro > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm text-telkora-text">
            Pendiente de cobro: <span className="font-semibold text-yellow-400">{formatEUR(kpis.pendienteCobro)}</span>
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar chart: ingresos vs gastos */}
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Ingresos vs Gastos (6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => formatEUR(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
              <Bar dataKey="ingresos" fill="#00FF88" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="gastos" fill="#FF4444" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Line chart: beneficio neto */}
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Beneficio neto mensual</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.map((d) => ({ ...d, beneficio: d.ingresos - d.gastos }))} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => formatEUR(Number(v ?? 0))}
              />
              <Line type="monotone" dataKey="beneficio" stroke="#00FF88" strokeWidth={2} dot={{ fill: '#00FF88', r: 3 }} name="Beneficio" />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Transactions table */}
      <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-telkora-text">Transacciones</h2>
          <div className="flex items-center gap-2">
            {/* Tipo filter */}
            <div className="flex rounded-md border border-telkora-border text-xs">
              {(['todos', 'ingreso', 'gasto'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1.5 transition-colors capitalize ${
                    filtroTipo === t ? 'bg-telkora-card2 text-telkora-text' : 'text-telkora-muted hover:text-telkora-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="h-8 bg-telkora-accent text-xs font-semibold text-telkora-bg hover:bg-telkora-accent2"
            >
              <Plus className="mr-1.5 size-3.5" />
              Nueva
            </Button>
          </div>
        </div>

        {txFiltradas.length === 0 ? (
          <p className="py-8 text-center text-xs text-telkora-muted">Sin transacciones</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-telkora-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-telkora-border bg-telkora-card2">
                  <th className="px-3 py-2.5 text-left text-telkora-muted">Concepto</th>
                  <th className="px-3 py-2.5 text-left text-telkora-muted">Categoría</th>
                  <th className="px-3 py-2.5 text-left text-telkora-muted">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-telkora-muted">Estado</th>
                  <th className="px-3 py-2.5 text-right text-telkora-muted">Importe</th>
                </tr>
              </thead>
              <tbody>
                {txFiltradas.map((tx) => (
                  <tr key={tx.id} className="border-b border-telkora-border/50 hover:bg-telkora-card2/50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: tx.tipo === 'ingreso' ? '#00CC6A' : '#FF4444' }}
                        />
                        <span className="text-telkora-text">{tx.concepto}</span>
                        {tx.es_recurrente && (
                          <span className="rounded bg-telkora-card2 px-1 py-0.5 text-[9px] text-telkora-muted">REC</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-telkora-muted">{tx.categoria ?? '—'}</td>
                    <td className="px-3 py-2.5 text-telkora-muted">
                      {tx.fecha_cobro ? formatDate(tx.fecha_cobro) : formatDate(tx.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium capitalize"
                        style={{
                          backgroundColor: ESTADO_COLORS[tx.estado] + '20',
                          color: ESTADO_COLORS[tx.estado],
                        }}
                      >
                        {tx.estado}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${tx.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.tipo === 'gasto' ? '−' : '+'}{formatEUR(tx.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TransaccionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateTransaccion}
        clientes={clientes}
      />
    </div>
  )
}
