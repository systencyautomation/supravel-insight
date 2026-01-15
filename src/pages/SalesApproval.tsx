import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingSales, PendingSale } from '@/hooks/usePendingSales';
import { FipeTable, InventoryItem } from '@/components/approval/FipeTable';
import { CommissionCalculator, CalculationData } from '@/components/approval/CommissionCalculator';
import { ApprovalActions } from '@/components/approval/ApprovalActions';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function SalesApproval() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, effectiveOrgId, isSuperAdmin, userRoles } = useAuth();
  
  const { pendingSales, count, loading, refetch } = usePendingSales();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  // Check permissions
  const canApprove = useMemo(() => {
    if (isSuperAdmin) return true;
    return userRoles.some(role => role.role === 'admin' || role.role === 'manager');
  }, [isSuperAdmin, userRoles]);

  // Current sale
  const currentSale = useMemo(() => {
    return pendingSales[currentIndex] || null;
  }, [pendingSales, currentIndex]);

  // Load inventory
  useEffect(() => {
    if (!effectiveOrgId) return;

    const loadInventory = async () => {
      setInventoryLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .order('model_name');

      if (error) {
        console.error('Error loading inventory:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a tabela FIPE',
          variant: 'destructive',
        });
      } else {
        setInventory(data || []);
      }
      setInventoryLoading(false);
    };

    loadInventory();
  }, [effectiveOrgId, toast]);

  // Auto-match inventory item by product code
  useEffect(() => {
    if (currentSale?.produto_codigo && inventory.length > 0) {
      const matchedItem = inventory.find(
        item => item.internal_code === currentSale.produto_codigo
      );
      if (matchedItem) {
        setSelectedInventoryItem(matchedItem);
      } else {
        setSelectedInventoryItem(null);
      }
    } else {
      setSelectedInventoryItem(null);
    }
  }, [currentSale, inventory]);

  const handleSelectInventoryItem = useCallback((item: InventoryItem) => {
    setSelectedInventoryItem(item);
  }, []);

  const handleCalculationChange = useCallback((data: CalculationData) => {
    setCalculationData(data);
  }, []);

  const handleApprove = async () => {
    if (!currentSale || !user || !calculationData) return;

    const { error } = await supabase
      .from('sales')
      .update({
        status: 'aprovado',
        table_value: calculationData.valorTabela,
        percentual_comissao: calculationData.percentualComissao,
        percentual_icms: calculationData.icmsDestino,
        payment_method: calculationData.tipoPagamento,
        over_price: calculationData.overPrice,
        over_price_liquido: calculationData.overPriceLiquido,
        commission_calculated: calculationData.comissaoTotal,
        observacoes: calculationData.observacoes,
        aprovado_por: user.id,
        aprovado_em: new Date().toISOString(),
      })
      .eq('id', currentSale.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar a venda',
        variant: 'destructive',
      });
      throw error;
    }

    toast({
      title: 'Venda aprovada',
      description: `NFe ${currentSale.nfe_number} aprovada com sucesso`,
    });

    await refetch();
    
    // Go to next or stay at same index (which will show next item)
    if (currentIndex >= pendingSales.length - 1) {
      setCurrentIndex(Math.max(0, pendingSales.length - 2));
    }
  };

  const handleReject = async (motivo: string) => {
    if (!currentSale || !calculationData) return;

    const { error } = await supabase
      .from('sales')
      .update({
        status: 'rejeitado',
        observacoes: calculationData.observacoes,
        motivo_rejeicao: motivo,
      })
      .eq('id', currentSale.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar a venda',
        variant: 'destructive',
      });
      throw error;
    }

    toast({
      title: 'Venda rejeitada',
      description: `NFe ${currentSale.nfe_number} rejeitada`,
      variant: 'destructive',
    });

    await refetch();
    
    if (currentIndex >= pendingSales.length - 1) {
      setCurrentIndex(Math.max(0, pendingSales.length - 2));
    }
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(pendingSales.length - 1, prev + 1));
  };

  if (loading || inventoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando vendas pendentes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
          <Bell className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhuma venda pendente</h2>
          <p className="text-muted-foreground mb-6">
            Todas as vendas foram processadas.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      
      {/* Header with navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              <span className="font-semibold">Vendas Pendentes</span>
              <span className="bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full text-sm font-medium">
                {count}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentIndex + 1} de {count}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex >= count - 1}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <FipeTable
                inventory={inventory}
                selectedItemId={selectedInventoryItem?.id || null}
                onSelectItem={handleSelectInventoryItem}
                autoMatchCode={currentSale?.produto_codigo}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <CommissionCalculator
                sale={currentSale}
                selectedInventoryItem={selectedInventoryItem}
                onCalculationChange={handleCalculationChange}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Actions */}
      {canApprove ? (
        <ApprovalActions
          onApprove={handleApprove}
          onReject={handleReject}
          disabled={!currentSale}
        />
      ) : (
        <div className="p-4 border-t bg-muted/50 text-center text-muted-foreground">
          Você não tem permissão para aprovar vendas. Apenas administradores e gerentes podem aprovar.
        </div>
      )}
    </div>
  );
}
