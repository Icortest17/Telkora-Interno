import { createClient } from '@/lib/supabase/server'
import { getPerfil, getUsuarios } from '@/lib/profile'
import { LeadKanbanWrapper } from './LeadKanbanWrapper'

export default async function LeadsPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()
  const esAdmin = perfil?.rol === 'admin'

  const query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  const [leadsRes, usuarios] = await Promise.all([
    query,
    getUsuarios(),
  ])

  return (
    <div className="flex h-full flex-col">
      <LeadKanbanWrapper
        initialLeads={leadsRes.data ?? []}
        currentUserId={perfil?.userId ?? ''}
        usuarios={usuarios}
        esAdmin={esAdmin}
      />
    </div>
  )
}
