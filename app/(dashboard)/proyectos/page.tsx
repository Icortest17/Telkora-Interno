import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { KanbanProyectos } from '@/components/proyectos/KanbanProyectos'
import type { Proyecto, Cliente } from '@/types'

export default async function ProyectosPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()

  let proyQuery = supabase.from('proyectos').select('*').order('created_at', { ascending: false })
  if (perfil?.rol === 'socio') proyQuery = proyQuery.eq('owner_id', perfil.userId) as typeof proyQuery

  const [proyectosRes, clientesRes] = await Promise.all([
    proyQuery,
    supabase.from('clientes').select('id, empresa').eq('estado', 'activo').order('empresa'),
  ])

  const proyectos: Proyecto[] = proyectosRes.data ?? []
  const clientes: Pick<Cliente, 'id' | 'empresa'>[] = clientesRes.data ?? []

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <KanbanProyectos
        proyectos={proyectos}
        clientes={clientes}
        currentUserId={perfil?.userId ?? ''}
      />
    </div>
  )
}
