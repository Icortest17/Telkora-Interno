import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { FinanzasClient } from '@/components/finanzas/FinanzasClient'
import type { Transaccion, Cliente } from '@/types'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()
  const esSocio = perfil?.rol === 'socio'

  let txQuery = supabase.from('transacciones').select('*').order('created_at', { ascending: false })
  if (esSocio) txQuery = txQuery.eq('owner_id', perfil!.userId) as typeof txQuery

  const [txRes, clientesRes, mrrRes] = await Promise.all([
    txQuery,
    supabase.from('clientes').select('id, empresa').eq('estado', 'activo').order('empresa'),
    esSocio
      ? Promise.resolve({ data: [] })
      : supabase.from('clientes').select('mrr').eq('estado', 'activo'),
  ])

  const transacciones: Transaccion[] = txRes.data ?? []
  const clientes: Pick<Cliente, 'id' | 'empresa'>[] = clientesRes.data ?? []
  const mrrActual = (mrrRes.data ?? []).reduce((s: number, c: { mrr?: number | null }) => s + (c.mrr ?? 0), 0)

  return (
    <FinanzasClient
      transacciones={transacciones}
      clientes={clientes}
      mrrActual={mrrActual}
    />
  )
}
