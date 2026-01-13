import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pendente' | 'pago' | 'parcial';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        status === 'pago' && 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
        status === 'pendente' && 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
        status === 'parcial' && 'bg-secondary text-secondary-foreground'
      )}
    >
      {status}
    </span>
  );
}
