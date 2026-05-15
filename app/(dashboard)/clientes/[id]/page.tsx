import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { ClienteDetailClient } from './ClienteDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const perfil = await getPerfil()
  if (!perfil) redirect('/login')
  const esAdmin = perfil.rol === 'admin'

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cliente) notFound()

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, nombre, estado, porcentaje_completado, fecha_entrega_estimada')
    .eq('cliente_id', id)

  return <ClienteDetailClient initialCliente={cliente} proyectos={proyectos ?? []} esAdmin={esAdmin} />
}
