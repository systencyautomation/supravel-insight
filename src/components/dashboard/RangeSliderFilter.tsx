import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface RangeSliderFilterProps {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  format?: 'currency' | 'percent' | 'number';
  step?: number;
  className?: string;
}

export function RangeSliderFilter({
  label,
  min,
  max,
  value,
  onChange,
  format = 'currency',
  step = 1000,
  className,
}: RangeSliderFilterProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    const typedValue: [number, number] = [newValue[0], newValue[1]];
    setLocalValue(typedValue);
    onChange(typedValue);
  };

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return formatCurrency(val);
    }
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString('pt-BR');
  };

  const handleInputChange = (index: 0 | 1, inputValue: string) => {
    // Parse Brazilian format (1.234,56 or 1234.56)
    const cleaned = inputValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numericValue = parseFloat(cleaned) || 0;
    
    const newValue: [number, number] = [...localValue] as [number, number];
    newValue[index] = Math.max(min, Math.min(max, numericValue));
    
    // Ensure min <= max
    if (index === 0 && newValue[0] > newValue[1]) {
      newValue[0] = newValue[1];
    }
    if (index === 1 && newValue[1] < newValue[0]) {
      newValue[1] = newValue[0];
    }
    
    setLocalValue(newValue);
    onChange(newValue);
  };

  const isFiltered = localValue[0] !== min || localValue[1] !== max;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </Label>
        {isFiltered && (
          <button
            onClick={() => {
              const resetValue: [number, number] = [min, max];
              setLocalValue(resetValue);
              onChange(resetValue);
            }}
            className="text-xs text-primary hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <Slider
        value={localValue}
        min={min}
        max={max}
        step={step}
        onValueChange={handleSliderChange}
        className="py-2"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={formatValue(localValue[0])}
            onChange={(e) => handleInputChange(0, e.target.value)}
            className="h-8 text-xs text-center font-mono"
            placeholder="Mín"
          />
        </div>
        <span className="text-muted-foreground text-xs">—</span>
        <div className="flex-1">
          <Input
            type="text"
            value={formatValue(localValue[1])}
            onChange={(e) => handleInputChange(1, e.target.value)}
            className="h-8 text-xs text-center font-mono"
            placeholder="Máx"
          />
        </div>
      </div>
    </div>
  );
}
