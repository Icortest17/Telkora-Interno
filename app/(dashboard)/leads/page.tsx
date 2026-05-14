import { createClient } from '@/lib/supabase/server'
import { LeadKanbanWrapper } from './LeadKanbanWrapper'

export default async function LeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-full flex-col">
      <LeadKanbanWrapper
        initialLeads={leads ?? []}
        currentUserId={user?.id ?? ''}
      />
    </div>
  )
}
