import { useState, useMemo, useCallback } from 'react';
import { SaleWithCalculations } from './useSalesWithCalculations';
import { format } from 'date-fns';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnFilters {
  data: Set<string>;
  nf: Set<string>;
  cliente: Set<string>;
  produto: Set<string>;
  status: Set<string>;
}

export interface SalesFiltersState {
  filters: ColumnFilters;
  sortColumn: keyof SaleWithCalculations | null;
  sortDirection: SortDirection;
  globalSearch: string;
}

const initialFilters: ColumnFilters = {
  data: new Set(),
  nf: new Set(),
  cliente: new Set(),
  produto: new Set(),
  status: new Set(),
};

export function useSalesFilters(sales: SaleWithCalculations[]) {
  const [filters, setFilters] = useState<ColumnFilters>(initialFilters);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  // Extract unique values for each column
  const uniqueValues = useMemo(() => {
    const data = new Set<string>();
    const nf = new Set<string>();
    const cliente = new Set<string>();
    const produto = new Set<string>();
    const status = new Set<string>();

    sales.forEach((sale) => {
      if (sale.emission_date) {
        data.add(format(new Date(sale.emission_date), 'dd/MM/yyyy'));
      }
      if (sale.nfe_number) nf.add(sale.nfe_number);
      if (sale.client_name) cliente.add(sale.client_name);
      if (sale.produto_modelo) produto.add(sale.produto_modelo);
      if (sale.status) status.add(sale.status);
    });

    return {
      data: Array.from(data).sort(),
      nf: Array.from(nf).sort(),
      cliente: Array.from(cliente).sort(),
      produto: Array.from(produto).sort(),
      status: Array.from(status).sort(),
    };
  }, [sales]);

  // Check if any filter is active for a column
  const hasActiveFilter = useCallback(
    (column: keyof ColumnFilters) => {
      return filters[column].size > 0;
    },
    [filters]
  );

  // Update filter for a specific column
  const setColumnFilter = useCallback(
    (column: keyof ColumnFilters, values: Set<string>) => {
      setFilters((prev) => ({
        ...prev,
        [column]: values,
      }));
    },
    []
  );

  // Clear filter for a specific column
  const clearColumnFilter = useCallback((column: keyof ColumnFilters) => {
    setFilters((prev) => ({
      ...prev,
      [column]: new Set(),
    }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(initialFilters);
    setSortColumn(null);
    setSortDirection(null);
    setGlobalSearch('');
  }, []);

  // Handle sort
  const handleSort = useCallback((column: string, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  // Apply filters and sorting
  const filteredAndSortedSales = useMemo(() => {
    let result = [...sales];

    // Apply global search
    if (globalSearch) {
      const search = globalSearch.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.client_name?.toLowerCase().includes(search) ||
          sale.nfe_number?.toLowerCase().includes(search) ||
          sale.produto_modelo?.toLowerCase().includes(search) ||
          sale.client_cnpj?.includes(search)
      );
    }

    // Apply column filters
    if (filters.data.size > 0) {
      result = result.filter((sale) => {
        if (!sale.emission_date) return false;
        const dateStr = format(new Date(sale.emission_date), 'dd/MM/yyyy');
        return filters.data.has(dateStr);
      });
    }

    if (filters.nf.size > 0) {
      result = result.filter((sale) => sale.nfe_number && filters.nf.has(sale.nfe_number));
    }

    if (filters.cliente.size > 0) {
      result = result.filter((sale) => sale.client_name && filters.cliente.has(sale.client_name));
    }

    if (filters.produto.size > 0) {
      result = result.filter((sale) => sale.produto_modelo && filters.produto.has(sale.produto_modelo));
    }

    if (filters.status.size > 0) {
      result = result.filter((sale) => sale.status && filters.status.has(sale.status));
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
          case 'emission_date':
            aVal = a.emission_date ? new Date(a.emission_date).getTime() : 0;
            bVal = b.emission_date ? new Date(b.emission_date).getTime() : 0;
            break;
          case 'nfe_number':
            aVal = a.nfe_number || '';
            bVal = b.nfe_number || '';
            break;
          case 'client_name':
            aVal = a.client_name?.toLowerCase() || '';
            bVal = b.client_name?.toLowerCase() || '';
            break;
          case 'produto_modelo':
            aVal = a.produto_modelo?.toLowerCase() || '';
            bVal = b.produto_modelo?.toLowerCase() || '';
            break;
          case 'total_value':
            aVal = Number(a.total_value) || 0;
            bVal = Number(b.total_value) || 0;
            break;
          case 'entradaCalculada':
            aVal = a.entradaCalculada || 0;
            bVal = b.entradaCalculada || 0;
            break;
          case 'percentualComissaoCalculado':
            aVal = a.percentualComissaoCalculado || 0;
            bVal = b.percentualComissaoCalculado || 0;
            break;
          case 'valorComissaoCalculado':
            aVal = a.valorComissaoCalculado || 0;
            bVal = b.valorComissaoCalculado || 0;
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sales, filters, sortColumn, sortDirection, globalSearch]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(filters).forEach((set) => {
      if (set.size > 0) count++;
    });
    return count;
  }, [filters]);

  return {
    filters,
    sortColumn,
    sortDirection,
    globalSearch,
    uniqueValues,
    filteredSales: filteredAndSortedSales,
    hasActiveFilter,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
    handleSort,
    setGlobalSearch,
    activeFilterCount,
  };
}
