import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadDetailClient } from './LeadDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lead) notFound()

  const { data: actividades } = await supabase
    .from('lead_actividades')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  return (
    <LeadDetailClient
      initialLead={lead}
      initialActividades={actividades ?? []}
      currentUserId={user.id}
    />
  )
}
