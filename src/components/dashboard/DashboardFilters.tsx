import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SaleWithDetails } from '@/hooks/useSalesMetrics';

export interface DashboardFilterValues {
  clients: Set<string>;
  products: Set<string>;
  statuses: Set<string>;
}

interface DashboardFiltersProps {
  sales: SaleWithDetails[];
  filters: DashboardFilterValues;
  onChange: (filters: DashboardFilterValues) => void;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  pago: 'Pago',
  rejeitado: 'Rejeitado',
};

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected.size > 0 ? 'secondary' : 'outline'}
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium',
            selected.size > 0 && 'border-primary/30'
          )}
        >
          {label}
          {selected.size > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
              {selected.size}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {options.length > 6 && (
          <div className="p-2 border-b border-border">
            <Input
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        )}
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {filtered.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(option)}
                  onCheckedChange={() => onToggle(option)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">
                  {STATUS_LABELS[option] || option}
                </span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhum resultado
              </p>
            )}
          </div>
        </ScrollArea>
        {selected.size > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" size="sm" onClick={onClear} className="w-full h-7 text-xs">
                Limpar filtro
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DashboardFilters({ sales, filters, onChange, className }: DashboardFiltersProps) {
  // Extract unique values
  const { clients, products, statuses } = useMemo(() => {
    const clientSet = new Set<string>();
    const productSet = new Set<string>();
    const statusSet = new Set<string>();

    sales.forEach((s) => {
      if (s.client_name) clientSet.add(s.client_name);
      if (s.produto_modelo) productSet.add(s.produto_modelo);
      if (s.status) statusSet.add(s.status);
    });

    return {
      clients: Array.from(clientSet).sort(),
      products: Array.from(productSet).sort(),
      statuses: Array.from(statusSet).sort(),
    };
  }, [sales]);

  const activeCount = filters.clients.size + filters.products.size + filters.statuses.size;

  const toggle = (key: keyof DashboardFilterValues, value: string) => {
    const next = new Set(filters[key]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange({ ...filters, [key]: next });
  };

  const clearKey = (key: keyof DashboardFilterValues) => {
    onChange({ ...filters, [key]: new Set() });
  };

  const clearAll = () => {
    onChange({ clients: new Set(), products: new Set(), statuses: new Set() });
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">Filtros</span>
      </div>

      <FilterDropdown
        label="Cliente"
        options={clients}
        selected={filters.clients}
        onToggle={(v) => toggle('clients', v)}
        onClear={() => clearKey('clients')}
      />
      <FilterDropdown
        label="Produto"
        options={products}
        selected={filters.products}
        onToggle={(v) => toggle('products', v)}
        onClear={() => clearKey('products')}
      />
      <FilterDropdown
        label="Status"
        options={statuses}
        selected={filters.statuses}
        onToggle={(v) => toggle('statuses', v)}
        onClear={() => clearKey('statuses')}
      />

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Limpar ({activeCount})
        </Button>
      )}
    </div>
  );
}
