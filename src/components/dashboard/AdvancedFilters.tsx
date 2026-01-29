import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RangeSliderFilter } from './RangeSliderFilter';
import { SaleWithDetails } from '@/hooks/useSalesMetrics';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ValueFilters {
  faturamento: [number, number];
  comissaoEmpresa: [number, number];
  overLiquido: [number, number];
  comissaoVendedor: [number, number];
}

interface AdvancedFiltersProps {
  sales: SaleWithDetails[];
  filters: ValueFilters;
  onFiltersChange: (filters: ValueFilters) => void;
  className?: string;
}

export function AdvancedFilters({
  sales,
  filters,
  onFiltersChange,
  className,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate min/max bounds from data
  const bounds = useMemo(() => {
    if (!sales.length) {
      return {
        faturamento: { min: 0, max: 500000 },
        comissaoEmpresa: { min: 0, max: 100000 },
        overLiquido: { min: 0, max: 50000 },
        comissaoVendedor: { min: 0, max: 50000 },
      };
    }

    const faturamentos = sales.map(s => s.total_value || 0);
    const comissoesEmpresa = sales.map(s => {
      const tableValue = s.table_value || 0;
      const percentComissao = s.percentual_comissao || 0;
      const overLiquido = s.over_price_liquido || 0;
      return (tableValue * percentComissao / 100) + Math.max(0, overLiquido);
    });
    const oversLiquidos = sales.map(s => Math.max(0, s.over_price_liquido || 0));
    const comissoesVendedor = sales.map(s => s.commission_calculated || 0);

    const roundUp = (val: number) => Math.ceil(val / 10000) * 10000;
    const roundDown = (val: number) => Math.floor(val / 10000) * 10000;

    return {
      faturamento: { 
        min: roundDown(Math.min(...faturamentos)), 
        max: roundUp(Math.max(...faturamentos)) || 500000 
      },
      comissaoEmpresa: { 
        min: roundDown(Math.min(...comissoesEmpresa)), 
        max: roundUp(Math.max(...comissoesEmpresa)) || 100000 
      },
      overLiquido: { 
        min: roundDown(Math.min(...oversLiquidos)), 
        max: roundUp(Math.max(...oversLiquidos)) || 50000 
      },
      comissaoVendedor: { 
        min: roundDown(Math.min(...comissoesVendedor)), 
        max: roundUp(Math.max(...comissoesVendedor)) || 50000 
      },
    };
  }, [sales]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.faturamento[0] !== bounds.faturamento.min || filters.faturamento[1] !== bounds.faturamento.max) count++;
    if (filters.comissaoEmpresa[0] !== bounds.comissaoEmpresa.min || filters.comissaoEmpresa[1] !== bounds.comissaoEmpresa.max) count++;
    if (filters.overLiquido[0] !== bounds.overLiquido.min || filters.overLiquido[1] !== bounds.overLiquido.max) count++;
    if (filters.comissaoVendedor[0] !== bounds.comissaoVendedor.min || filters.comissaoVendedor[1] !== bounds.comissaoVendedor.max) count++;
    return count;
  }, [filters, bounds]);

  const handleReset = () => {
    onFiltersChange({
      faturamento: [bounds.faturamento.min, bounds.faturamento.max],
      comissaoEmpresa: [bounds.comissaoEmpresa.min, bounds.comissaoEmpresa.max],
      overLiquido: [bounds.overLiquido.min, bounds.overLiquido.max],
      comissaoVendedor: [bounds.comissaoVendedor.min, bounds.comissaoVendedor.max],
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('', className)}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            variant={activeFiltersCount > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="gap-2 h-8"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </Button>
        </CollapsibleTrigger>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar todos
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-muted/20 rounded-lg border border-border/50">
          <RangeSliderFilter
            label="Faturamento"
            min={bounds.faturamento.min}
            max={bounds.faturamento.max}
            value={filters.faturamento}
            onChange={(value) => onFiltersChange({ ...filters, faturamento: value })}
            format="currency"
            step={5000}
          />

          <RangeSliderFilter
            label="Comissão Empresa"
            min={bounds.comissaoEmpresa.min}
            max={bounds.comissaoEmpresa.max}
            value={filters.comissaoEmpresa}
            onChange={(value) => onFiltersChange({ ...filters, comissaoEmpresa: value })}
            format="currency"
            step={1000}
          />

          <RangeSliderFilter
            label="Over Líquido"
            min={bounds.overLiquido.min}
            max={bounds.overLiquido.max}
            value={filters.overLiquido}
            onChange={(value) => onFiltersChange({ ...filters, overLiquido: value })}
            format="currency"
            step={1000}
          />

          <RangeSliderFilter
            label="Comissão Vendedor"
            min={bounds.comissaoVendedor.min}
            max={bounds.comissaoVendedor.max}
            value={filters.comissaoVendedor}
            onChange={(value) => onFiltersChange({ ...filters, comissaoVendedor: value })}
            format="currency"
            step={500}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
