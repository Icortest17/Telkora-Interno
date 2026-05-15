'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Plus, TrendingUp, TrendingDown, DollarSign,
  Activity, Trash2, Pencil, ChevronLeft, ChevronRight,
  FileDown, Search, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransaccionForm } from './TransaccionForm'
import { formatEUR, formatDate } from '@/lib/utils'
import {
  format, subMonths, addMonths, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import type { Transaccion, Cliente } from '@/types'
import { CATEGORIAS_TRANSACCION } from '@/lib/constants'
import type { Usuario } from '@/lib/profile'

interface FinanzasClientProps {
  transacciones: Transaccion[]
  clientes: Pick<Cliente, 'id' | 'empresa'>[]
  mrrActual: number
  usuarios?: Usuario[]
  currentUserId?: string
  esAdmin?: boolean
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: '#FFD700',
  enviada:   '#4A9EFF',
  cobrada:   '#00CC6A',
  vencida:   '#FF4444',
}

type Periodo = 'mes' | 'trimestre' | 'año' | 'todo'

export function FinanzasClient({ transacciones: initialTx, clientes, mrrActual, usuarios = [], currentUserId = '', esAdmin = false }: FinanzasClientProps) {
  const supabase = createClient()
  const [transacciones, setTransacciones] = useState<Transaccion[]>(initialTx)
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaccion | null>(null)

  // ── Filtros ──────────────────────────────────────────────
  const [periodoTipo, setPeriodoTipo] = useState<Periodo>('mes')
  const [mesRef, setMesRef] = useState(new Date())          // mes base para navegación
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // ── Rango del período seleccionado ───────────────────────
  const { rangoInicio, rangoFin, labelPeriodo } = useMemo(() => {
    if (periodoTipo === 'todo') return { rangoInicio: null, rangoFin: null, labelPeriodo: 'Todo' }
    if (periodoTipo === 'mes') return {
      rangoInicio: startOfMonth(mesRef),
      rangoFin: endOfMonth(mesRef),
      labelPeriodo: format(mesRef, 'MMMM yyyy', { locale: es }),
    }
    if (periodoTipo === 'trimestre') {
      const trimNum = Math.ceil((mesRef.getMonth() + 1) / 3)
      return {
        rangoInicio: startOfQuarter(mesRef),
        rangoFin: endOfQuarter(mesRef),
        labelPeriodo: `T${trimNum} ${mesRef.getFullYear()}`,
      }
    }
    return {
      rangoInicio: startOfYear(mesRef),
      rangoFin: endOfYear(mesRef),
      labelPeriodo: `${mesRef.getFullYear()}`,
    }
  }, [periodoTipo, mesRef])

  function navAnterior() {
    if (periodoTipo === 'mes') setMesRef(subMonths(mesRef, 1))
    else if (periodoTipo === 'trimestre') setMesRef(subMonths(mesRef, 3))
    else if (periodoTipo === 'año') setMesRef(new Date(mesRef.getFullYear() - 1, 0, 1))
  }
  function navSiguiente() {
    if (periodoTipo === 'mes') setMesRef(addMonths(mesRef, 1))
    else if (periodoTipo === 'trimestre') setMesRef(addMonths(mesRef, 3))
    else if (periodoTipo === 'año') setMesRef(new Date(mesRef.getFullYear() + 1, 0, 1))
  }

  // ── Transacciones del período (para KPIs) ────────────────
  const txPeriodo = useMemo(() => {
    if (!rangoInicio || !rangoFin) return transacciones
    return transacciones.filter((t) => {
      const fecha = t.fecha_cobro ? new Date(t.fecha_cobro) : new Date(t.created_at)
      return fecha >= rangoInicio && fecha <= rangoFin
    })
  }, [transacciones, rangoInicio, rangoFin])

  // ── KPIs ─────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ingresosPeriodo = txPeriodo.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.importe, 0)
    const gastosPeriodo = txPeriodo.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.importe, 0)
    const pendienteCobro = transacciones
      .filter((t) => t.tipo === 'ingreso' && ['pendiente', 'enviada'].includes(t.estado))
      .reduce((s, t) => s + t.importe, 0)
    return { ingresosPeriodo, gastosPeriodo, beneficioPeriodo: ingresosPeriodo - gastosPeriodo, pendienteCobro }
  }, [txPeriodo, transacciones])

  // ── Datos gráfico 6 meses centrado en mesRef ─────────────
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(mesRef, 5 - i)
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
  }, [transacciones, mesRef])

  // ── Tabla filtrada ────────────────────────────────────────
  const txFiltradas = useMemo(() => {
    return txPeriodo.filter((t) => {
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
      if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
      if (filtroCategoria !== 'todas' && t.categoria !== filtroCategoria) return false
      if (filtroCliente !== 'todos' && t.cliente_id !== filtroCliente) return false
      if (busqueda && !t.concepto.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [txPeriodo, filtroTipo, filtroEstado, filtroCategoria, filtroCliente, busqueda])

  const hayFiltrosActivos = filtroTipo !== 'todos' || filtroEstado !== 'todos' ||
    filtroCategoria !== 'todas' || filtroCliente !== 'todos' || busqueda !== ''

  function limpiarFiltros() {
    setFiltroTipo('todos'); setFiltroEstado('todos')
    setFiltroCategoria('todas'); setFiltroCliente('todos'); setBusqueda('')
  }

  // ── Exportar Excel ────────────────────────────────────────
  function exportarExcel() {
    const filas = txFiltradas.map((t) => ({
      Concepto: t.concepto,
      Tipo: t.tipo,
      Categoría: t.categoria ?? '',
      Estado: t.estado,
      Importe: t.tipo === 'gasto' ? -t.importe : t.importe,
      Fecha: t.fecha_cobro ? formatDate(t.fecha_cobro) : formatDate(t.created_at),
      Recurrente: t.es_recurrente ? 'Sí' : 'No',
      Cliente: clientes.find((c) => c.id === t.cliente_id)?.empresa ?? '',
      Notas: t.notas ?? '',
    }))

    const resumen = [
      { Concepto: 'RESUMEN', Tipo: '', Categoría: '', Estado: '', Importe: '', Fecha: '', Recurrente: '', Cliente: '', Notas: '' },
      { Concepto: 'Ingresos período', Importe: kpis.ingresosPeriodo } as never,
      { Concepto: 'Gastos período', Importe: kpis.gastosPeriodo } as never,
      { Concepto: 'Beneficio neto', Importe: kpis.beneficioPeriodo } as never,
      { Concepto: 'Pendiente de cobro', Importe: kpis.pendienteCobro } as never,
    ]

    const ws = XLSX.utils.json_to_sheet(filas)
    const wsResumen = XLSX.utils.json_to_sheet(resumen)

    // Anchos de columna
    ws['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 40 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    const nombreArchivo = `Telkora_Finanzas_${labelPeriodo.replace(/\s/g, '_')}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    toast.success(`Exportado: ${nombreArchivo}`)
  }

  // ── CRUD ──────────────────────────────────────────────────
  async function handleDeleteTransaccion(id: string) {
    const { error } = await supabase.from('transacciones').delete().eq('id', id)
    if (error) { toast.error('Error eliminando transacción'); return }
    setTransacciones((prev) => prev.filter((t) => t.id !== id))
    toast.success('Transacción eliminada')
  }

  async function handleCreateTransaccion(data: Partial<Transaccion>) {
    if (data.id) {
      // Edit mode
      const { id, ...fields } = data
      const { data: updated, error } = await supabase
        .from('transacciones')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) { toast.error('Error actualizando transacción'); return }
      setTransacciones((prev) => prev.map((t) => t.id === id ? updated : t))
      toast.success('Transacción actualizada')
      setEditingTx(null)
    } else {
      // Create mode
      const payload = { ...data, owner_id: data.owner_id || currentUserId }
      const { data: nueva, error } = await supabase.from('transacciones').insert(payload).select().single()
      if (error) { toast.error('Error creando transacción'); return }
      setTransacciones((prev) => [nueva, ...prev])
      toast.success('Transacción añadida')
      setShowForm(false)
    }
  }

  const KPI_CARDS = [
    { label: 'MRR Actual', value: formatEUR(mrrActual), icon: Activity, color: 'text-telkora-accent' },
    { label: `Ingresos ${periodoTipo === 'todo' ? 'total' : labelPeriodo}`, value: formatEUR(kpis.ingresosPeriodo), icon: TrendingUp, color: 'text-green-400' },
    { label: `Gastos ${periodoTipo === 'todo' ? 'total' : labelPeriodo}`, value: formatEUR(kpis.gastosPeriodo), icon: TrendingDown, color: 'text-red-400' },
    { label: 'Beneficio neto', value: formatEUR(kpis.beneficioPeriodo), icon: DollarSign, color: kpis.beneficioPeriodo >= 0 ? 'text-telkora-accent' : 'text-telkora-danger' },
  ]

  const selectCls = 'rounded-md border border-telkora-border bg-telkora-card px-2.5 py-1.5 text-xs text-telkora-text focus:outline-none focus:border-telkora-accent'

  return (
    <div className="space-y-6">

      {/* ── Selector de período ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-telkora-border bg-telkora-card px-5 py-3">
        <div className="flex rounded-md border border-telkora-border text-xs overflow-hidden">
          {(['mes', 'trimestre', 'año', 'todo'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodoTipo(p)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                periodoTipo === p ? 'bg-telkora-accent text-telkora-bg font-semibold' : 'text-telkora-muted hover:text-telkora-text'
              }`}
            >
              {p === 'todo' ? 'Todo' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {periodoTipo !== 'todo' && (
          <div className="flex items-center gap-2">
            <button onClick={navAnterior} className="rounded p-1 text-telkora-muted hover:text-telkora-text hover:bg-telkora-card2">
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-telkora-text capitalize">
              {labelPeriodo}
            </span>
            <button onClick={navSiguiente} className="rounded p-1 text-telkora-muted hover:text-telkora-text hover:bg-telkora-card2">
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        <Button
          size="sm"
          onClick={exportarExcel}
          variant="outline"
          className="h-8 border-telkora-border text-xs text-telkora-muted hover:text-telkora-text"
        >
          <FileDown className="mr-1.5 size-3.5" />
          Exportar Excel
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-telkora-muted" />
              <p className="text-xs text-telkora-muted capitalize">{label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Pendiente de cobro ── */}
      {kpis.pendienteCobro > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm text-telkora-text">
            Pendiente de cobro (global): <span className="font-semibold text-yellow-400">{formatEUR(kpis.pendienteCobro)}</span>
          </p>
        </div>
      )}

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Ingresos vs Gastos (6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v) => formatEUR(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
              <Bar dataKey="ingresos" fill="#00FF88" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="gastos" fill="#FF4444" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-telkora-text">Beneficio neto mensual</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.map((d) => ({ ...d, beneficio: d.ingresos - d.gastos }))} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v) => formatEUR(Number(v ?? 0))} />
              <Line type="monotone" dataKey="beneficio" stroke="#00FF88" strokeWidth={2} dot={{ fill: '#00FF88', r: 3 }} name="Beneficio" />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── Tabla de transacciones ── */}
      <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-telkora-text">Transacciones</h2>
            <span className="rounded-full bg-telkora-card2 px-2 py-0.5 text-xs text-telkora-muted">
              {txFiltradas.length}
            </span>
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

        {/* Filtros de tabla */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-telkora-muted" />
            <input
              type="text"
              placeholder="Buscar concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-7 rounded-md border border-telkora-border bg-telkora-card pl-7 pr-3 text-xs text-telkora-text placeholder:text-telkora-muted focus:outline-none focus:border-telkora-accent"
            />
          </div>

          {/* Tipo */}
          <div className="flex rounded-md border border-telkora-border text-xs overflow-hidden">
            {(['todos', 'ingreso', 'gasto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  filtroTipo === t ? 'bg-telkora-card2 text-telkora-text' : 'text-telkora-muted hover:text-telkora-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Estado */}
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={selectCls}>
            <option value="todos">Todos los estados</option>
            {Object.keys(ESTADO_COLORS).map((e) => (
              <option key={e} value={e} className="capitalize">{e.charAt(0).toUpperCase() + e.slice(1)}</option>
            ))}
          </select>

          {/* Categoría */}
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={selectCls}>
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS_TRANSACCION.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Cliente */}
          {clientes.length > 0 && (
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className={selectCls}>
              <option value="todos">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.empresa}</option>
              ))}
            </select>
          )}

          {/* Limpiar filtros */}
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-telkora-muted hover:text-telkora-danger hover:bg-telkora-card2"
            >
              <X className="size-3" />
              Limpiar
            </button>
          )}
        </div>

        {txFiltradas.length === 0 ? (
          <p className="py-8 text-center text-xs text-telkora-muted">Sin transacciones para los filtros seleccionados</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-telkora-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-telkora-border bg-telkora-card2">
                    <th className="px-3 py-2.5 text-left text-telkora-muted">Concepto</th>
                    <th className="px-3 py-2.5 text-left text-telkora-muted">Categoría</th>
                    <th className="px-3 py-2.5 text-left text-telkora-muted">Cliente</th>
                    <th className="px-3 py-2.5 text-left text-telkora-muted">Fecha</th>
                    <th className="px-3 py-2.5 text-left text-telkora-muted">Estado</th>
                    <th className="px-3 py-2.5 text-right text-telkora-muted">Importe</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {txFiltradas.map((tx) => (
                    <tr key={tx.id} className="group border-b border-telkora-border/50 hover:bg-telkora-card2/50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tx.tipo === 'ingreso' ? '#00CC6A' : '#FF4444' }} />
                          <span className="text-telkora-text">{tx.concepto}</span>
                          {tx.es_recurrente && (
                            <span className="rounded bg-telkora-card2 px-1 py-0.5 text-[9px] text-telkora-muted">REC</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-telkora-muted">{tx.categoria ?? '—'}</td>
                      <td className="px-3 py-2.5 text-telkora-muted">
                        {clientes.find((c) => c.id === tx.cliente_id)?.empresa ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-telkora-muted">
                        {tx.fecha_cobro ? formatDate(tx.fecha_cobro) : formatDate(tx.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium capitalize"
                          style={{ backgroundColor: ESTADO_COLORS[tx.estado] + '20', color: ESTADO_COLORS[tx.estado] }}
                        >
                          {tx.estado}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${tx.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.tipo === 'gasto' ? '−' : '+'}{formatEUR(tx.importe)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="invisible flex items-center justify-end gap-1 group-hover:visible">
                          <button
                            onClick={() => setEditingTx(tx)}
                            className="rounded p-1 text-telkora-muted hover:text-telkora-accent"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaccion(tx.id)}
                            className="rounded p-1 text-telkora-muted hover:text-telkora-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales */}
                <tfoot>
                  <tr className="border-t-2 border-telkora-border bg-telkora-card2">
                    <td colSpan={5} className="px-3 py-2.5 text-xs font-semibold text-telkora-text">
                      Total ({txFiltradas.length} transacciones)
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-telkora-accent">
                      {formatEUR(
                        txFiltradas.reduce((s, t) => s + (t.tipo === 'ingreso' ? t.importe : -t.importe), 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      <TransaccionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateTransaccion}
        clientes={clientes}
        usuarios={usuarios}
        currentUserId={currentUserId}
        esAdmin={esAdmin}
      />

      {editingTx && (
        <TransaccionForm
          open={true}
          onClose={() => setEditingTx(null)}
          onSubmit={handleCreateTransaccion}
          clientes={clientes}
          usuarios={usuarios}
          currentUserId={currentUserId}
          esAdmin={esAdmin}
          initialData={editingTx}
        />
      )}
    </div>
  )
}
