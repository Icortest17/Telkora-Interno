'use client'

import { Bell } from 'lucide-react'
import { useAlertas } from '@/hooks/useAlertas'
import type { Lead } from '@/types'

interface AlertasBadgeProps {
  leads: Lead[]
}

export function AlertasBadge({ leads }: AlertasBadgeProps) {
  const { totalUrgentes } = useAlertas(leads)

  return (
    <button className="relative flex items-center justify-center rounded-md p-2 text-telkora-muted transition-colors hover:bg-telkora-card2 hover:text-telkora-text">
      <Bell className="size-4" />
      {totalUrgentes > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-telkora-danger text-[10px] font-bold text-white">
          {totalUrgentes > 9 ? '9+' : totalUrgentes}
        </span>
      )}
    </button>
  )
}
