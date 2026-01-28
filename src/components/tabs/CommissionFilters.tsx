import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CommissionFiltersState {
  sellerId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  search: string;
}

interface SellerOption {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface CommissionFiltersProps {
  sellers: SellerOption[];
  filters: CommissionFiltersState;
  onFiltersChange: (filters: CommissionFiltersState) => void;
  type: 'vendedor' | 'representante';
}

export function CommissionFilters({ 
  sellers, 
  filters, 
  onFiltersChange,
  type 
}: CommissionFiltersProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sellerId) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    onFiltersChange({
      sellerId: null,
      startDate: null,
      endDate: null,
      search: '',
    });
  };

  const handleSellerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sellerId: value === 'all' ? null : value,
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      startDate: date || null,
    });
    setStartOpen(false);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      endDate: date || null,
    });
    setEndOpen(false);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const typeLabel = type === 'vendedor' ? 'Vendedor' : 'Representante';

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/30 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Filtro de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, NF..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filtro de vendedor/representante */}
        <Select
          value={filters.sellerId || 'all'}
          onValueChange={handleSellerChange}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Todos os ${typeLabel}es`} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="all">Todos os {typeLabel}es</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                <div className="flex flex-col">
                  <span>{seller.name}</span>
                  {seller.company && (
                    <span className="text-xs text-muted-foreground">
                      {seller.company}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Data inicial */}
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 justify-start text-left font-normal',
                !filters.startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.startDate ? (
                format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })
              ) : (
                'Data início'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate || undefined}
              onSelect={handleStartDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* Data final */}
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 justify-start text-left font-normal',
                !filters.endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.endDate ? (
                format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })
              ) : (
                'Data fim'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={filters.endDate || undefined}
              onSelect={handleEndDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
              locale={ptBR}
              disabled={(date) =>
                filters.startDate ? date < filters.startDate : false
              }
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
