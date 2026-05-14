import { createClient } from '@/lib/supabase/server'
import { KanbanProyectos } from '@/components/proyectos/KanbanProyectos'
import type { Proyecto, Cliente } from '@/types'

export default async function ProyectosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [proyectosRes, clientesRes] = await Promise.all([
    supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
    supabase.from('clientes').select('id, empresa').eq('estado', 'activo').order('empresa'),
  ])

  const proyectos: Proyecto[] = proyectosRes.data ?? []
  const clientes: Pick<Cliente, 'id' | 'empresa'>[] = clientesRes.data ?? []

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <KanbanProyectos
        proyectos={proyectos}
        clientes={clientes}
        currentUserId={user?.id ?? ''}
      />
    </div>
  )
}
