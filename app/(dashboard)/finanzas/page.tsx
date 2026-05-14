import { createClient } from '@/lib/supabase/server'
import { FinanzasClient } from '@/components/finanzas/FinanzasClient'
import type { Transaccion, Cliente } from '@/types'

export default async function FinanzasPage() {
  const supabase = await createClient()

  const [txRes, clientesRes, mrrRes] = await Promise.all([
    supabase
      .from('transacciones')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('clientes').select('id, empresa').eq('estado', 'activo').order('empresa'),
    supabase.from('clientes').select('mrr').eq('estado', 'activo'),
  ])

  const transacciones: Transaccion[] = txRes.data ?? []
  const clientes: Pick<Cliente, 'id' | 'empresa'>[] = clientesRes.data ?? []
  const mrrActual = (mrrRes.data ?? []).reduce((s, c) => s + (c.mrr ?? 0), 0)

  return (
    <FinanzasClient
      transacciones={transacciones}
      clientes={clientes}
      mrrActual={mrrActual}
    />
  )
}
