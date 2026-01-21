import { useState } from 'react';
import { Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColumnFilter } from './ColumnFilter';
import { SortDirection } from '@/hooks/useSalesFilters';
import { cn } from '@/lib/utils';

interface ColumnFilterHeaderProps {
  title: string;
  columnKey: string;
  values: string[];
  selectedValues: Set<string>;
  onFilterChange: (selected: Set<string>) => void;
  onSort: (direction: SortDirection) => void;
  sortColumn: string | null;
  sortDirection: SortDirection;
  type?: 'text' | 'number' | 'date' | 'currency';
  onQuickSort?: () => void;
}

export function ColumnFilterHeader({
  title,
  columnKey,
  values,
  selectedValues,
  onFilterChange,
  onSort,
  sortColumn,
  sortDirection,
  type = 'text',
  onQuickSort,
}: ColumnFilterHeaderProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilter = selectedValues.size > 0;
  const isActiveSortColumn = sortColumn === columnKey;

  const SortIcon = () => {
    if (!isActiveSortColumn || !sortDirection) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> 
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Clickable title for quick sort */}
      <button
        className="flex items-center gap-1 font-medium hover:text-primary transition-colors cursor-pointer select-none"
        onClick={onQuickSort}
      >
        <span>{title}</span>
        <SortIcon />
      </button>

      {/* Filter popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'p-0.5 rounded hover:bg-accent transition-colors',
              hasActiveFilter && 'text-primary'
            )}
          >
            <Filter
              className={cn(
                'h-3.5 w-3.5',
                hasActiveFilter ? 'fill-primary/20' : ''
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-auto" sideOffset={4}>
          <ColumnFilter
            title={title}
            values={values}
            selectedValues={selectedValues}
            onFilterChange={onFilterChange}
            onSort={(direction) => onSort(direction)}
            sortDirection={isActiveSortColumn ? sortDirection : null}
            type={type}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
