import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { LeadKanbanWrapper } from './LeadKanbanWrapper'

export default async function LeadsPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()

  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
  if (perfil?.rol === 'socio') query = query.eq('owner_id', perfil.userId) as typeof query

  const { data: leads } = await query

  return (
    <div className="flex h-full flex-col">
      <LeadKanbanWrapper
        initialLeads={leads ?? []}
        currentUserId={perfil?.userId ?? ''}
      />
    </div>
  )
}
