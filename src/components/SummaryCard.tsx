import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
}

export function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  variant = 'default',
  trend,
  trendValue,
  icon: Icon
}: SummaryCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success bg-success/10';
      case 'down': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className={cn(
      'group relative rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
      variant === 'primary' && 'border-l-4 border-l-primary shadow-md',
      variant === 'success' && 'border-l-4 border-l-success shadow-md',
      variant === 'warning' && 'border-l-4 border-l-warning shadow-md'
    )}>
      {/* Background gradient on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          
          {Icon && (
            <div className={cn(
              'p-2 rounded-xl',
              variant === 'primary' && 'bg-primary/10 text-primary',
              variant === 'success' && 'bg-success/10 text-success',
              variant === 'warning' && 'bg-warning/10 text-warning',
              variant === 'default' && 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        
        <div className="flex items-end gap-3">
          <p className="text-2xl font-bold font-mono tracking-tight">
            {value}
          </p>
          
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1',
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
