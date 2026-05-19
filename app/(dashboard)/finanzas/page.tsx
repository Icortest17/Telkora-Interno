import { createClient } from '@/lib/supabase/server'
import { getPerfil, getUsuarios } from '@/lib/profile'
import { FinanzasClient } from '@/components/finanzas/FinanzasClient'
import type { Transaccion, Cliente } from '@/types'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()
  const esAdmin = perfil?.rol === 'admin'

  const txQuery = supabase.from('transacciones').select('*').order('created_at', { ascending: false })

  const [txRes, clientesRes, mrrRes, usuarios] = await Promise.all([
    txQuery,
    supabase.from('clientes').select('id, empresa').eq('estado', 'activo').order('empresa'),
    supabase.from('clientes').select('mrr').eq('estado', 'activo'),
    getUsuarios(),
  ])

  const transacciones: Transaccion[] = txRes.data ?? []
  const clientes: Pick<Cliente, 'id' | 'empresa'>[] = clientesRes.data ?? []
  const mrrActual = (mrrRes.data ?? []).reduce((s: number, c: { mrr?: number | null }) => s + (c.mrr ?? 0), 0)

  return (
    <FinanzasClient
      transacciones={transacciones}
      clientes={clientes}
      mrrActual={mrrActual}
      usuarios={usuarios}
      currentUserId={perfil?.userId ?? ''}
      esAdmin={esAdmin}
    />
  )
}
