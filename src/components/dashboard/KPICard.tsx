import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedNumber } from './AnimatedNumber';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent' | 'number';
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  delay?: number;
}

export function KPICard({
  title,
  value,
  format = 'currency',
  subtitle,
  trend,
  icon: Icon,
  variant = 'default',
  delay = 0,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };

  const TrendIcon = getTrendIcon();

  const variantStyles = {
    default: {
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      glow: '',
    },
    primary: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      glow: 'shadow-primary/5',
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      glow: 'shadow-success/5',
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      glow: 'shadow-warning/5',
    },
    destructive: {
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      glow: 'shadow-destructive/5',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        styles.glow && `shadow-lg ${styles.glow}`,
        "animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber 
                value={value} 
                format={format}
                delay={delay + 200}
                duration={1200}
              />
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          {Icon && (
            <div className={cn(
              "p-3 rounded-xl transition-transform duration-300 hover:scale-110",
              styles.iconBg
            )}>
              <Icon className={cn("h-5 w-5", styles.iconColor)} />
            </div>
          )}
        </div>

        {trend && TrendIcon && (
          <div className="mt-4 flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium rounded-full px-2 py-0.5",
              trend.value > 0 && "bg-success/10 text-success",
              trend.value < 0 && "bg-destructive/10 text-destructive",
              trend.value === 0 && "bg-muted text-muted-foreground"
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
            {trend.label && (
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </CardContent>

      {/* Subtle gradient overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />
    </Card>
  );
}
