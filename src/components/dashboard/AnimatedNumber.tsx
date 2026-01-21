import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatCurrency } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format?: 'currency' | 'percent' | 'number';
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  format = 'number',
  duration = 1000,
  delay = 0,
  className,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const animatedValue = useAnimatedNumber(value, { duration, delay });

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    }
  };

  return (
    <span className={className}>
      {prefix}
      {formatValue(animatedValue)}
      {suffix}
    </span>
  );
}
