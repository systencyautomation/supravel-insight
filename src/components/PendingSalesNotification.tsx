import { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePendingSales } from '@/hooks/usePendingSales';
import { formatCurrency } from '@/lib/approvalCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PendingSalesNotification() {
  const navigate = useNavigate();
  const { pendingSales, count, loading } = usePendingSales();
  const { effectiveOrgId } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleSync = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (syncing || cooldown) return;
    setSyncing(true);
    const minDelay = new Promise(resolve => setTimeout(resolve, 4000));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-nfe-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ organization_id: effectiveOrgId }),
        }
      );
      if (!res.ok) throw new Error('fail');
      await minDelay;
      toast.success('Sincronização iniciada com sucesso');
      setCooldown(true);
    } catch {
      await minDelay;
      toast.error('Falha ao iniciar sincronização');
    } finally {
      setSyncing(false);
    }
  }, [syncing, cooldown, effectiveOrgId]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 30000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Show first 5 sales in dropdown
  const displayedSales = pendingSales.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl hover:bg-accent/80 relative"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Vendas Pendentes</h4>
            <p className="text-sm text-muted-foreground">
              {count === 0 
                ? 'Nenhuma venda pendente' 
                : `${count} venda${count > 1 ? 's' : ''} aguardando aprovação`
              }
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing || cooldown}
            className="h-8 w-8 rounded-lg hover:bg-accent/80 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : displayedSales.length > 0 ? (
          <>
            {displayedSales.map((sale) => (
              <DropdownMenuItem 
                key={sale.id}
                onClick={() => navigate(`/aprovacao?saleId=${sale.id}`)}
                className="cursor-pointer p-3"
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-start">
                    <span className="font-medium font-mono text-sm">
                      NFe {sale.nfe_number || '-'}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(sale.total_value || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{sale.client_name || 'Cliente não informado'}</span>
                    <span>{sale.uf_destiny || '-'}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            
            {count > 5 && (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                +{count - 5} venda{count - 5 > 1 ? 's' : ''} não exibida{count - 5 > 1 ? 's' : ''}
              </div>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate('/pendencias')}
              className="cursor-pointer justify-center text-primary font-medium"
            >
              Ver todas →
            </DropdownMenuItem>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma venda pendente
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}