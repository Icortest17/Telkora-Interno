'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertasBadge } from './AlertasBadge'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import type { Lead } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/leads':      'Pipeline de leads',
  '/clientes':   'Clientes',
  '/proyectos':  'Proyectos',
  '/finanzas':   'Finanzas',
  '/ajustes':    'Ajustes',
}

interface HeaderProps {
  userEmail: string
  leads: Lead[]
}

export function Header({ userEmail, leads }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const title = Object.entries(PAGE_TITLES).find(
    ([key]) => key === '/' ? pathname === '/' : pathname.startsWith(key)
  )?.[1] ?? 'Telkora'

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Error cerrando sesión')
    }
  }

  const initials = getInitials(userEmail.split('@')[0])

  return (
    <header className="flex h-14 items-center justify-between border-b border-telkora-border bg-telkora-card px-6">
      <h1 className="text-sm font-semibold text-telkora-text">{title}</h1>
      <div className="flex items-center gap-2">
        <AlertasBadge leads={leads} />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none ring-telkora-accent focus:ring-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-telkora-card2 text-xs text-telkora-text">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-telkora-border bg-telkora-card"
          >
            <div className="px-3 py-2">
              <p className="truncate text-xs text-telkora-muted">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="bg-telkora-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-telkora-muted hover:text-telkora-danger"
            >
              <LogOut className="mr-2 size-3.5" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
