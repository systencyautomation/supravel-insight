import { useState, useMemo } from 'react';
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SortDirection } from '@/hooks/useSalesFilters';
import { cn } from '@/lib/utils';

interface ColumnFilterProps {
  title: string;
  values: string[];
  selectedValues: Set<string>;
  onFilterChange: (selected: Set<string>) => void;
  onSort: (direction: SortDirection) => void;
  sortDirection: SortDirection;
  type?: 'text' | 'number' | 'date' | 'currency';
  onClose: () => void;
}

export function ColumnFilter({
  title,
  values,
  selectedValues,
  onFilterChange,
  onSort,
  sortDirection,
  type = 'text',
  onClose,
}: ColumnFilterProps) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedValues));

  const filteredValues = useMemo(() => {
    if (!search) return values;
    const searchLower = search.toLowerCase();
    return values.filter((v) => v.toLowerCase().includes(searchLower));
  }, [values, search]);

  const allSelected = localSelected.size === 0 || localSelected.size === values.length;

  const handleSelectAll = () => {
    if (allSelected && localSelected.size > 0) {
      setLocalSelected(new Set());
    } else {
      setLocalSelected(new Set(values));
    }
  };

  const handleValueToggle = (value: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setLocalSelected(newSelected);
  };

  const handleApply = () => {
    // If all are selected or none, clear the filter
    if (localSelected.size === values.length || localSelected.size === 0) {
      onFilterChange(new Set());
    } else {
      onFilterChange(localSelected);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleClear = () => {
    setLocalSelected(new Set());
  };

  const isNumeric = type === 'number' || type === 'currency';

  return (
    <div className="w-64 p-0">
      {/* Sort Options */}
      <div className="p-2 space-y-1">
        <button
          onClick={() => {
            onSort('asc');
            onClose();
          }}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors',
            sortDirection === 'asc' && 'bg-accent text-accent-foreground'
          )}
        >
          {isNumeric ? (
            <ArrowUp01 className="h-4 w-4" />
          ) : (
            <ArrowUpAZ className="h-4 w-4" />
          )}
          {isNumeric ? 'Ordenar menor → maior' : 'Ordenar A → Z'}
        </button>
        <button
          onClick={() => {
            onSort('desc');
            onClose();
          }}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors',
            sortDirection === 'desc' && 'bg-accent text-accent-foreground'
          )}
        >
          {isNumeric ? (
            <ArrowDown01 className="h-4 w-4" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" />
          )}
          {isNumeric ? 'Ordenar maior → menor' : 'Ordenar Z → A'}
        </button>
      </div>

      <Separator />

      {/* Filter by Values */}
      <div className="p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Filtrar por valores</p>

        {/* Select All */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Checkbox
              checked={allSelected}
              className="h-4 w-4"
            />
            <span>Selecionar tudo</span>
          </button>
          <span className="text-xs text-muted-foreground">{values.length}</span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>

        {/* Values List */}
        <ScrollArea className="h-48">
          <div className="space-y-0.5">
            {filteredValues.map((value) => (
              <button
                key={value}
                onClick={() => handleValueToggle(value)}
                className="w-full flex items-center gap-2 px-1 py-1 text-sm rounded hover:bg-accent transition-colors text-left"
              >
                <Checkbox
                  checked={localSelected.size === 0 || localSelected.has(value)}
                  className="h-4 w-4 flex-shrink-0"
                />
                <span className="truncate">{value}</span>
              </button>
            ))}
            {filteredValues.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhum resultado
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Actions */}
      <div className="p-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleApply} className="text-xs">
            <Check className="h-3.5 w-3.5 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
