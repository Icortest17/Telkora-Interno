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
  CalendarDays,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; soon?: boolean }[] = [
  { href: '/',            label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/leads',       label: 'Pipeline de leads', icon: Kanban },
  { href: '/calendario',  label: 'Calendario',        icon: CalendarDays },
  { href: '/informes',   label: 'Informes',           icon: BarChart2 },
  { href: '/clientes',    label: 'Clientes',          icon: Users },
  { href: '/proyectos', label: 'Proyectos',          icon: FolderKanban },
  { href: '/finanzas',  label: 'Finanzas',           icon: DollarSign },
  { href: '/ajustes',   label: 'Ajustes',            icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-14 flex-shrink-0 flex-col border-r border-telkora-border bg-telkora-card lg:w-60">
      {/* Logo */}
      <div className="flex h-14 items-center justify-center border-b border-telkora-border px-2 lg:justify-start lg:px-5">
        <span className="text-lg font-bold tracking-tight text-telkora-accent lg:text-telkora-text">
          <span className="text-telkora-accent">T</span>
          <span className="hidden text-telkora-accent lg:inline">elkora</span>
          <span className="ml-1 hidden text-xs font-normal text-telkora-muted lg:inline">interno</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2 lg:p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={soon ? '#' : href}
              title={label}
              className={cn(
                'flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm transition-colors lg:justify-start lg:px-3',
                isActive
                  ? 'bg-telkora-accent/10 text-telkora-accent lg:border-l-2 lg:border-telkora-accent lg:bg-telkora-card2 lg:text-telkora-text'
                  : 'text-telkora-muted hover:bg-telkora-card2 hover:text-telkora-text',
                soon && 'cursor-default opacity-50'
              )}
            >
              <Icon className="size-4 flex-shrink-0" />
              <span className="hidden flex-1 lg:block">{label}</span>
              {soon && (
                <span className="hidden rounded bg-telkora-card2 px-1.5 py-0.5 text-[10px] text-telkora-muted lg:block">
                  Pronto
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-telkora-border p-2 lg:p-3">
        <p className="hidden px-3 text-[10px] text-telkora-muted lg:block">Telkora © 2026</p>
      </div>
    </aside>
  )
}
