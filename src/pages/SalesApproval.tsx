import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingSales } from '@/hooks/usePendingSales';
import { useEditableSale } from '@/hooks/useEditableSale';
import { CommissionCalculator, CalculationData, type Installment } from '@/components/approval/CommissionCalculator';
import { ApprovalActions } from '@/components/approval/ApprovalActions';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SpreadsheetViewer } from '@/components/stock/SpreadsheetViewer';
import { useFipeDocument, type FipeDocument } from '@/hooks/useFipeDocument';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SaleInfoHeader } from '@/components/approval/SaleInfoHeader';
import { Badge } from '@/components/ui/badge';

export default function SalesApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, effectiveOrgId, isSuperAdmin, userRoles } = useAuth();
  
  // Check if we're in edit mode (editing an already approved sale)
  const isEditMode = searchParams.get('mode') === 'edit';
  const editSaleId = isEditMode ? searchParams.get('saleId') : null;
  
  // Use separate hooks for pending sales vs edit mode
  const { pendingSales, count: pendingCount, loading: pendingLoading, refetch: refetchPending } = usePendingSales();
  const { sale: editableSale, installments: editableInstallments, loading: editableLoading, refetch: refetchEditable } = useEditableSale(editSaleId);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);
  const [fipeDocument, setFipeDocument] = useState<FipeDocument | null>(null);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const { fetchLatestDocument } = useFipeDocument();

  // Check permissions
  const canApprove = useMemo(() => {
    if (isSuperAdmin) return true;
    return userRoles.some(role => role.role === 'admin' || role.role === 'manager');
  }, [isSuperAdmin, userRoles]);

  // Current sale - either from edit mode or pending queue
  const currentSale = useMemo(() => {
    if (isEditMode && editableSale) {
      return editableSale;
    }
    return pendingSales[currentIndex] || null;
  }, [isEditMode, editableSale, pendingSales, currentIndex]);

  // Total count for navigation
  const count = isEditMode ? 1 : pendingCount;
  const loading = isEditMode ? editableLoading : pendingLoading;

  // Load FIPE document
  useEffect(() => {
    const loadDocument = async () => {
      if (!effectiveOrgId) {
        setDocumentLoading(false);
        return;
      }
      try {
        const doc = await fetchLatestDocument();
        setFipeDocument(doc);
      } catch (error) {
        console.error('Error fetching FIPE document:', error);
      } finally {
        setDocumentLoading(false);
      }
    };
    loadDocument();
  }, [effectiveOrgId, fetchLatestDocument]);

  // Load installments for current sale
  useEffect(() => {
    if (isEditMode && editableInstallments.length > 0) {
      setInstallments(editableInstallments);
      return;
    }
    
    const fetchInstallments = async () => {
      if (!currentSale?.id) {
        setInstallments([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('sale_id', currentSale.id)
        .order('installment_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching installments:', error);
        setInstallments([]);
        return;
      }
      
      setInstallments(data || []);
    };
    
    if (!isEditMode) {
      fetchInstallments();
    }
  }, [currentSale?.id, isEditMode, editableInstallments]);

  // Navigate to specific sale from URL param (only for pending mode)
  useEffect(() => {
    if (isEditMode) return;
    
    const saleId = searchParams.get('saleId');
    if (saleId && pendingSales.length > 0) {
      const index = pendingSales.findIndex(s => s.id === saleId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [searchParams, pendingSales, isEditMode]);

  const handleCalculationChange = useCallback((data: CalculationData) => {
    setCalculationData(data);
  }, []);

  const handleSave = async () => {
    if (!currentSale || !user || !calculationData) return;

    const updateData: Record<string, unknown> = {
      table_value: calculationData.valorTabela,
      percentual_comissao: calculationData.percentualComissao,
      percentual_icms: calculationData.icmsDestino,
      icms_tabela: calculationData.icmsTabela,
      payment_method: calculationData.tipoPagamento,
      over_price: calculationData.overPrice,
      over_price_liquido: calculationData.overPriceLiquido,
      commission_calculated: calculationData.comissaoTotal,
      valor_entrada: calculationData.valorEntrada,
      aprovado_por: user.id,
      aprovado_em: new Date().toISOString(),
    };

    // Only update status if NOT in edit mode
    if (!isEditMode) {
      updateData.status = 'aprovado';
    }

    const { error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', currentSale.id);

    if (error) {
      toast({
        title: 'Erro',
        description: isEditMode ? 'Não foi possível salvar as alterações' : 'Não foi possível aprovar a venda',
        variant: 'destructive',
      });
      throw error;
    }

    toast({
      title: isEditMode ? 'Alterações salvas' : 'Venda aprovada',
      description: isEditMode 
        ? `NFe ${currentSale.nfe_number} atualizada com sucesso`
        : `NFe ${currentSale.nfe_number} aprovada com sucesso`,
    });

    if (isEditMode) {
      await refetchEditable();
      navigate(-1); // Go back to previous page
    } else {
      await refetchPending();
      // Go to next or stay at same index (which will show next item)
      if (currentIndex >= pendingSales.length - 1) {
        setCurrentIndex(Math.max(0, pendingSales.length - 2));
      }
    }
  };

  const handleReject = async (motivo: string) => {
    if (!currentSale || !calculationData) return;

    const { error } = await supabase
      .from('sales')
      .update({
        status: 'rejeitado',
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

    await refetchPending();
    
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

  if (loading || documentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isEditMode ? 'Carregando venda...' : 'Carregando vendas pendentes...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state only for pending mode
  if (!isEditMode && pendingCount === 0) {
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

  // Show error if edit mode but sale not found
  if (isEditMode && !editableSale) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
          <h2 className="text-2xl font-semibold mb-2">Venda não encontrada</h2>
          <p className="text-muted-foreground mb-6">
            A venda solicitada não foi encontrada ou você não tem permissão para acessá-la.
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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Pencil className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Editar Cálculos</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {currentSale?.status === 'pago' ? 'Pago' : 'Aprovado'}
                  </Badge>
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5 text-warning" />
                  <span className="font-semibold">Vendas Pendentes</span>
                  <span className="bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full text-sm font-medium">
                    {pendingCount}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {!isEditMode && (
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
                {currentIndex + 1} de {pendingCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex >= pendingCount - 1}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sale Info Header */}
      <SaleInfoHeader sale={currentSale} />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-lg">Tabela</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {fipeDocument ? (
                    <SpreadsheetViewer
                      gridData={fipeDocument.gridData}
                      colCount={fipeDocument.colCount}
                      rowCount={fipeDocument.rowCount}
                      fileName={fipeDocument.fileName}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Nenhuma planilha importada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <CommissionCalculator
                sale={currentSale}
                installments={installments}
                fipeDocument={fipeDocument}
                onCalculationChange={handleCalculationChange}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Actions */}
      {canApprove ? (
        isEditMode ? (
          <div className="p-4 border-t bg-card flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!currentSale}>
              Salvar Alterações
            </Button>
          </div>
        ) : (
          <ApprovalActions
            onApprove={handleSave}
            onReject={handleReject}
            disabled={!currentSale}
          />
        )
      ) : (
        <div className="p-4 border-t bg-muted/50 text-center text-muted-foreground">
          Você não tem permissão para aprovar vendas. Apenas administradores e gerentes podem aprovar.
        </div>
      )}
    </div>
  );
}
