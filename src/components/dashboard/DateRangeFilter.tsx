import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetKey = 'today' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom';

const presets: { key: PresetKey; label: string; getRange: () => { start: Date; end: Date } }[] = [
  {
    key: 'today',
    label: 'Hoje',
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    },
  },
  {
    key: '7days',
    label: '7 dias',
    getRange: () => {
      const today = new Date();
      return { start: subDays(today, 7), end: today };
    },
  },
  {
    key: '30days',
    label: '30 dias',
    getRange: () => {
      const today = new Date();
      return { start: subDays(today, 30), end: today };
    },
  },
  {
    key: 'thisMonth',
    label: 'Este Mês',
    getRange: () => {
      const today = new Date();
      return { start: startOfMonth(today), end: endOfMonth(today) };
    },
  },
  {
    key: 'lastMonth',
    label: 'Mês Anterior',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    },
  },
];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const handlePresetClick = (preset: typeof presets[number]) => {
    setActivePreset(preset.key);
    const range = preset.getRange();
    onChange({ ...range, label: preset.label });
  };

  const handleCustomRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (!range) return;
    
    setCustomRange(range);
    
    if (range.from && range.to) {
      setActivePreset('custom');
      onChange({
        start: range.from,
        end: range.to,
        label: `${format(range.from, 'dd/MM')} - ${format(range.to, 'dd/MM')}`,
      });
      setIsCalendarOpen(false);
    }
  };

  const displayLabel = value?.label || 'Este Mês';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Preset Buttons */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
        {presets.map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "h-8 text-xs font-medium transition-all",
              activePreset === preset.key && "shadow-sm"
            )}
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Picker */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === 'custom' ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              "h-8 gap-2 text-xs font-medium",
              activePreset === 'custom' && "shadow-sm"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {activePreset === 'custom' ? displayLabel : 'Personalizado'}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            defaultMonth={customRange.from}
            selected={customRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
