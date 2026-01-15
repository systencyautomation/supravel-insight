import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pendente' | 'pago' | 'parcial' | 'aprovado' | 'rejeitado';
  onClick?: () => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const isClickable = !!onClick;
  
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        status === 'pago' && 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
        status === 'pendente' && 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
        status === 'parcial' && 'bg-secondary text-secondary-foreground',
        status === 'aprovado' && 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
        status === 'rejeitado' && 'bg-destructive text-destructive-foreground',
        isClickable && 'cursor-pointer hover:opacity-80 transition-opacity'
      )}
    >
      {status}
    </span>
  );
}
