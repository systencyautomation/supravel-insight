import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface RecebimentosFilterValues {
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  cliente: string;
  nf: string;
  produto: string;
  status: 'todos' | 'pago' | 'pendente';
}

interface RecebimentosFiltersProps {
  filters: RecebimentosFilterValues;
  onFiltersChange: (filters: RecebimentosFilterValues) => void;
  onClear: () => void;
}

export function RecebimentosFilters({ filters, onFiltersChange, onClear }: RecebimentosFiltersProps) {
  const updateFilter = <K extends keyof RecebimentosFilterValues>(
    key: K,
    value: RecebimentosFilterValues[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      {/* Linha 1: Datas e Inputs de texto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Data Início */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dataInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dataInicio ? (
                  format(filters.dataInicio, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecionar...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dataInicio}
                onSelect={(date) => updateFilter('dataInicio', date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Data Fim */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dataFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dataFim ? (
                  format(filters.dataFim, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecionar...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dataFim}
                onSelect={(date) => updateFilter('dataFim', date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Input
            placeholder="Buscar cliente..."
            value={filters.cliente}
            onChange={(e) => updateFilter('cliente', e.target.value)}
          />
        </div>

        {/* NF */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">NF</Label>
          <Input
            placeholder="Número NF..."
            value={filters.nf}
            onChange={(e) => updateFilter('nf', e.target.value)}
          />
        </div>

        {/* Produto */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Produto</Label>
          <Input
            placeholder="Buscar produto..."
            value={filters.produto}
            onChange={(e) => updateFilter('produto', e.target.value)}
          />
        </div>
      </div>

      {/* Linha 2: Status e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <RadioGroup
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value as 'todos' | 'pago' | 'pendente')}
            className="flex items-center gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="todos" id="todos" />
              <Label htmlFor="todos" className="text-sm cursor-pointer">Todos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pago" id="pago" />
              <Label htmlFor="pago" className="text-sm cursor-pointer">Pago</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pendente" id="pendente" />
              <Label htmlFor="pendente" className="text-sm cursor-pointer">Pendente</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
