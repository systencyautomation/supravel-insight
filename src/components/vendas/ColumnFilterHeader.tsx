import { useState } from 'react';
import { Filter, ArrowUp, ArrowDown } from 'lucide-react';
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
}: ColumnFilterHeaderProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilter = selectedValues.size > 0;
  const isActiveSortColumn = sortColumn === columnKey;

  return (
    <div className="flex items-center gap-1">
      <span className="font-medium">{title}</span>
      
      {/* Sort indicator */}
      {isActiveSortColumn && sortDirection && (
        <span className="text-primary">
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
        </span>
      )}

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
