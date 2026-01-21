import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, User, Package, Command } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { SaleWithDetails } from '@/hooks/useSalesMetrics';
import { formatCurrency } from '@/lib/utils';

interface CommandBarProps {
  sales: SaleWithDetails[];
}

export function CommandBar({ sales }: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Extract unique clients
  const uniqueClients = Array.from(
    new Map(
      sales
        .filter((s) => s.client_name)
        .map((s) => [s.client_cnpj || s.client_name, { name: s.client_name!, cnpj: s.client_cnpj }])
    ).values()
  ).slice(0, 5);

  // Extract unique products
  const uniqueProducts = Array.from(
    new Set(
      sales
        .filter((s) => s.produto_modelo || s.produto_marca)
        .map((s) => s.produto_modelo || s.produto_marca)
    )
  ).slice(0, 5);

  // Recent sales (last 5)
  const recentSales = sales.slice(0, 5);

  const handleSelectSale = (saleId: string) => {
    setOpen(false);
    navigate(`/sales/${saleId}/approval`);
  };

  const handleSelectClient = (clientName: string) => {
    setOpen(false);
    // Could filter dashboard by client in future
    console.log('Filter by client:', clientName);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 h-9 text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-lg transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar cliente, NF-e, produto..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="h-10 w-10 text-muted-foreground/50" />
              <p>Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground">
                Tente buscar por nome do cliente ou número da NF-e
              </p>
            </div>
          </CommandEmpty>

          {recentSales.length > 0 && (
            <CommandGroup heading="Vendas Recentes">
              {recentSales.map((sale) => (
                <CommandItem
                  key={sale.id}
                  value={`${sale.nfe_number} ${sale.client_name}`}
                  onSelect={() => handleSelectSale(sale.id)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">
                      NF-e {sale.nfe_number || 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {sale.client_name || 'Cliente não informado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {formatCurrency(sale.total_value || 0)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={
                        sale.status === 'aprovado' || sale.status === 'pago'
                          ? 'bg-success/10 text-success border-success/30'
                          : sale.status === 'pendente'
                          ? 'bg-warning/10 text-warning border-warning/30'
                          : ''
                      }
                    >
                      {sale.status || 'N/A'}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {uniqueClients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {uniqueClients.map((client, index) => (
                  <CommandItem
                    key={index}
                    value={`${client.name} ${client.cnpj}`}
                    onSelect={() => handleSelectClient(client.name)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{client.name}</span>
                      {client.cnpj && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {client.cnpj}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {uniqueProducts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Produtos">
                {uniqueProducts.map((product, index) => (
                  <CommandItem
                    key={index}
                    value={product!}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{product}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
