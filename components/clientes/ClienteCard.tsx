import Link from 'next/link'
import { formatEUR } from '@/lib/utils'
import type { Cliente } from '@/types'

const TIER_CONFIG = {
  gold:   { label: 'Gold',   color: '#FFD700', bg: '#3D3000' },
  silver: { label: 'Silver', color: '#C0C0C0', bg: '#2A2A2A' },
  bronze: { label: 'Bronze', color: '#CD7F32', bg: '#2D1A00' },
}

const ESTADO_CONFIG = {
  activo:  { label: 'Activo',   color: '#00CC6A' },
  pausado: { label: 'Pausado',  color: '#FF8C00' },
  churned: { label: 'Churned',  color: '#FF4444' },
  upsell:  { label: 'Upsell',   color: '#AA77FF' },
}

interface ClienteCardProps {
  cliente: Cliente
}

export function ClienteCard({ cliente }: ClienteCardProps) {
  const tier = TIER_CONFIG[cliente.tier ?? 'bronze'] ?? TIER_CONFIG.bronze
  const estado = ESTADO_CONFIG[cliente.estado ?? 'activo'] ?? ESTADO_CONFIG.activo

  return (
    <Link href={`/clientes/${cliente.id}`}>
      <div className="rounded-xl border border-telkora-border bg-telkora-card p-4 transition-colors hover:border-telkora-accent/30 hover:bg-telkora-card2">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-telkora-text line-clamp-2">{cliente.empresa}</h3>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
        </div>

        {/* MRR */}
        <p className="text-lg font-bold text-telkora-accent">{formatEUR(cliente.mrr)}<span className="ml-1 text-xs font-normal text-telkora-muted">/mes</span></p>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <span style={{ color: estado.color }} className="text-xs font-medium">
            {estado.label}
          </span>
          {cliente.contacto && (
            <span className="text-xs text-telkora-muted">{cliente.contacto}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
