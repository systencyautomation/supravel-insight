import { useState, useEffect, useCallback } from 'react';
import { StockItem } from '@/types/commission';
import { StockTable } from '@/components/StockTable';
import { SummaryCard } from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImportDialog } from '@/components/stock/ImportDialog';

export function StockManagement() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { effectiveOrgId } = useAuth();

  const fetchInventory = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', effectiveOrgId);

      if (error) throw error;

      const mappedStock: StockItem[] = (data || []).map(item => ({
        id: item.id,
        modelo: item.model_name,
        codInterno: item.internal_code || '',
        valorTabela: item.base_price || 0,
        percentualComissao: item.base_commission_pct || 10,
        quantidade: item.quantity || 0,
      }));

      setStock(mappedStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const totalModelos = stock.length;
  const totalItens = stock.reduce((acc, item) => acc + item.quantidade, 0);

  const handleImportSuccess = () => {
    fetchInventory();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tabela FIPE</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Documento oficial - somente consulta
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setImportDialogOpen(true)} 
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar Planilha
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total de Modelos"
          value={totalModelos.toString()}
          subtitle="Na tabela"
          variant="primary"
        />
        <SummaryCard
          title="Itens Disponíveis"
          value={totalItens.toString()}
          subtitle="Quantidade total"
        />
        <SummaryCard
          title="Comissão 10%"
          value={stock.filter(s => s.percentualComissao === 10).length.toString()}
          subtitle="Modelos"
        />
        <SummaryCard
          title="Comissão 15%"
          value={stock.filter(s => s.percentualComissao === 15).length.toString()}
          subtitle="Modelos"
          variant="success"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Tabela de Preços</h3>
        {loading ? (
          <div className="border border-border p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : stock.length > 0 ? (
          <StockTable stock={stock} />
        ) : (
          <div className="border border-border p-8 text-center">
            <p className="text-muted-foreground">Nenhum item na tabela</p>
            <p className="text-xs text-muted-foreground mt-2">Importe uma planilha para cadastrar itens</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-muted/30 border border-border">
        <h3 className="text-sm font-semibold mb-2">⚠️ Documento Oficial</h3>
        <p className="text-xs text-muted-foreground">
          Esta tabela é tratada como documento oficial e não pode ser editada manualmente. 
          Para atualizar os dados, importe uma nova planilha Excel.
        </p>
      </div>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
