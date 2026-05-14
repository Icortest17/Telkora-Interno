import { Button } from '@/components/ui/button'
import { InboxIcon } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({
  title = 'Sin resultados',
  description = 'No hay datos para mostrar.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <InboxIcon className="mb-4 size-10 text-telkora-muted" />
      <h3 className="mb-1 text-sm font-medium text-telkora-text">{title}</h3>
      <p className="mb-4 text-xs text-telkora-muted">{description}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
