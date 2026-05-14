'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  Users,
  FolderKanban,
  DollarSign,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; soon?: boolean }[] = [
  { href: '/',          label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/leads',     label: 'Pipeline de leads', icon: Kanban },
  { href: '/clientes',  label: 'Clientes',          icon: Users },
  { href: '/proyectos', label: 'Proyectos',          icon: FolderKanban },
  { href: '/finanzas',  label: 'Finanzas',           icon: DollarSign },
  { href: '/ajustes',   label: 'Ajustes',            icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-telkora-border bg-telkora-card">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-telkora-border px-5">
        <span className="text-lg font-bold tracking-tight text-telkora-text">
          <span className="text-telkora-accent">Telkora</span>
          <span className="ml-1 text-xs font-normal text-telkora-muted">interno</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={soon ? '#' : href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-l-2 border-telkora-accent bg-telkora-card2 text-telkora-text'
                  : 'text-telkora-muted hover:bg-telkora-card2 hover:text-telkora-text',
                soon && 'cursor-default opacity-50'
              )}
            >
              <Icon className="size-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {soon && (
                <span className="rounded bg-telkora-card2 px-1.5 py-0.5 text-[10px] text-telkora-muted">
                  Pronto
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-telkora-border p-3">
        <p className="px-3 text-[10px] text-telkora-muted">Telkora © 2026</p>
      </div>
    </aside>
  )
}
