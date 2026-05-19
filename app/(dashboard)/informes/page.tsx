export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InformesClient } from '@/components/informes/InformesClient'

export default async function InformesPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [{ data: leads }, { data: clientes }, { data: perfiles }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, empresa, estado, valor_estimado, valor_ponderado, fuente, sector, owner_id, created_at, fecha_primer_contacto, updated_at, proximo_followup'),
    supabase
      .from('clientes')
      .select('id, estado, mrr, tier'),
    adminClient
      .from('perfiles')
      .select('user_id, nombre'),
  ])

  const usuarios = (perfiles ?? []).map((p: { user_id: string; nombre: string }) => ({
    userId: p.user_id,
    nombre: p.nombre,
  }))

  return (
    <InformesClient
      leads={leads ?? []}
      clientes={clientes ?? []}
      usuarios={usuarios}
    />
  )
}
