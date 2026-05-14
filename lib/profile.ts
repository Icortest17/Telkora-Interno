import { createClient } from '@/lib/supabase/server'

export type Rol = 'admin' | 'socio'

export interface Perfil {
  userId: string
  email: string
  nombre: string
  rol: Rol
}

export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('user_id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email ?? '',
    nombre: data?.nombre ?? '',
    rol: (data?.rol ?? 'socio') as Rol,
  }
}

export interface Usuario {
  userId: string
  nombre: string
}

export async function getUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('perfiles').select('user_id, nombre')
  return (data ?? []).map((p) => ({ userId: p.user_id, nombre: p.nombre }))
}
