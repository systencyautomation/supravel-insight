import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success';
}

export function SummaryCard({ title, value, subtitle, variant = 'default' }: SummaryCardProps) {
  return (
    <div className={cn(
      'rounded border border-border p-4',
      variant === 'primary' && 'border-l-4 border-l-primary',
      variant === 'success' && 'border-l-4 border-l-[hsl(var(--success))]'
    )}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-semibold font-mono">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
