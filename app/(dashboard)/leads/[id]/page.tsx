import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { LeadDetailClient } from './LeadDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  let query = supabase.from('leads').select('*').eq('id', id)
  if (perfil.rol === 'socio') query = query.eq('owner_id', perfil.userId) as typeof query

  const { data: lead, error } = await query.single()

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
      currentUserId={perfil.userId}
    />
  )
}
