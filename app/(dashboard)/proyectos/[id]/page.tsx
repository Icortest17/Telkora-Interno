import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil, getUsuarios } from '@/lib/profile'
import { ProyectoDetailClient } from '@/components/proyectos/ProyectoDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProyectoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()

  if (proyectoError || !proyecto) notFound()

  if (perfil.rol === 'socio' && proyecto.owner_id !== perfil.userId) notFound()

  const esAdmin = perfil.rol === 'admin'

  const [clienteResult, transaccionesResult, usuarios] = await Promise.all([
    supabase.from('clientes').select('id, empresa').eq('id', proyecto.cliente_id).single(),
    supabase.from('transacciones').select('*').eq('proyecto_id', id).order('created_at', { ascending: false }),
    esAdmin ? getUsuarios() : Promise.resolve([]),
  ])

  return (
    <ProyectoDetailClient
      proyecto={proyecto}
      cliente={clienteResult.data ?? null}
      transacciones={transaccionesResult.data ?? []}
      esAdmin={esAdmin}
      usuarios={usuarios}
    />
  )
}
