import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DocumentPreview } from '@/components/pre-approval/DocumentPreview';
import { AutoCalculator } from '@/components/pre-approval/AutoCalculator';
import { AIAnalyst } from '@/components/pre-approval/AIAnalyst';
import { usePendingSales } from '@/hooks/usePendingSales';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/approvalCalculator';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AnalysisResult {
  ia_commentary: string;
  boletos: Array<{ valor: number; vencimento: string; numero?: string }>;
  calculadora: {
    valor_tabela: number;
    percentual_comissao: number;
    icms_tabela: number;
    icms_destino: number;
    valor_faturado: number;
    valor_entrada: number;
    qtd_parcelas: number;
    valor_parcela: number;
    valor_presente: number;
    over_price_bruto: number;
    deducao_icms: number;
    deducao_pis_cofins: number;
    deducao_ir_csll: number;
    over_price_liquido: number;
    comissao_pedido: number;
    comissao_total: number;
    percentual_final: number;
  };
  analise_ia_status: string;
  fipe_match: boolean;
}

interface SaleDocument {
  id: string;
  document_type: string;
  filename: string;
  storage_path: string;
}

export default function PreApprovalInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const saleIdParam = searchParams.get('saleId');
  const { effectiveOrgId } = useAuth();
  const { pendingSales, count, loading: salesLoading } = usePendingSales();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(saleIdParam);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [documents, setDocuments] = useState<SaleDocument[]>([]);

  const selectedSale = useMemo(
    () => pendingSales.find(s => s.id === selectedSaleId) || null,
    [pendingSales, selectedSaleId]
  );

  // Select first sale if none selected
  useEffect(() => {
    if (!selectedSaleId && pendingSales.length > 0) {
      setSelectedSaleId(pendingSales[0].id);
    }
  }, [pendingSales, selectedSaleId]);

  // Fetch documents for selected sale
  useEffect(() => {
    if (!selectedSaleId || !effectiveOrgId) {
      setDocuments([]);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('sale_documents')
        .select('id, document_type, filename, storage_path')
        .eq('sale_id', selectedSaleId)
        .eq('organization_id', effectiveOrgId);

      setDocuments((data || []) as SaleDocument[]);
    })();
  }, [selectedSaleId, effectiveOrgId]);

  // Run AI analysis when sale is selected
  useEffect(() => {
    if (!selectedSale || !effectiveOrgId) {
      setAnalysisResult(null);
      return;
    }

    // If already analyzed, try to rebuild from persisted data
    if (selectedSale.analise_ia_status === 'concluido' || selectedSale.analise_ia_status === 'revisado') {
      // Use persisted values including ia_commentary from DB
      setAnalysisResult({
        ia_commentary: (selectedSale as any).ia_commentary || '',
        boletos: [],
        calculadora: {
          valor_tabela: selectedSale.table_value || 0,
          percentual_comissao: selectedSale.percentual_comissao || 0,
          icms_tabela: selectedSale.icms_tabela || 4,
          icms_destino: (selectedSale.percentual_icms || 7),
          valor_faturado: selectedSale.total_value || 0,
          valor_entrada: selectedSale.valor_entrada || 0,
          qtd_parcelas: 0,
          valor_parcela: 0,
          valor_presente: selectedSale.valor_presente || selectedSale.total_value || 0,
          over_price_bruto: selectedSale.over_price || 0,
          deducao_icms: selectedSale.icms || 0,
          deducao_pis_cofins: selectedSale.pis_cofins || 0,
          deducao_ir_csll: selectedSale.ir_csll || 0,
          over_price_liquido: selectedSale.over_price_liquido || 0,
          comissao_pedido: (selectedSale.percentual_comissao || 0) / 100 * (selectedSale.table_value || 0),
          comissao_total: selectedSale.commission_calculated || 0,
          percentual_final: selectedSale.total_value ? ((selectedSale.commission_calculated || 0) / selectedSale.total_value) * 100 : 0,
        },
        analise_ia_status: selectedSale.analise_ia_status || 'concluido',
        fipe_match: !!(selectedSale.table_value && selectedSale.table_value > 0),
      });
      return;
    }

    // For new sales, trigger analysis via parse-nfe-ai
    // First we need the XML from storage
    const runAnalysis = async () => {
      setAnalyzing(true);
      try {
        // Get XML document
        const xmlDoc = documents.find(d => d.document_type === 'xml');
        if (!xmlDoc) {
          console.log('No XML document found for analysis');
          setAnalyzing(false);
          return;
        }

        // Download XML
        const { data: xmlBlob } = await supabase.storage
          .from('sale-documents')
          .download(xmlDoc.storage_path);

        if (!xmlBlob) {
          console.error('Failed to download XML');
          setAnalyzing(false);
          return;
        }

        const xmlContent = await xmlBlob.text();

        // Get boleto PDFs as base64
        const boletoDocs = documents.filter(d => d.document_type === 'boleto');
        const pdfs: string[] = [];

        for (const bDoc of boletoDocs) {
          const { data: pdfBlob } = await supabase.storage
            .from('sale-documents')
            .download(bDoc.storage_path);

          if (pdfBlob) {
            const buffer = await pdfBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            bytes.forEach(b => binary += String.fromCharCode(b));
            pdfs.push(btoa(binary));
          }
        }

        // Call parse-nfe-ai
        const { data: result, error } = await supabase.functions.invoke('parse-nfe-ai', {
          body: {
            xml_content: xmlContent,
            pdfs,
            organization_id: effectiveOrgId,
          },
        });

        if (error) throw error;
        if (result?.success) {
          setAnalysisResult(result as AnalysisResult);
        }
      } catch (e) {
        console.error('Analysis error:', e);
        toast.error('Erro ao analisar venda');
      } finally {
        setAnalyzing(false);
      }
    };

    if (documents.length > 0) {
      runAnalysis();
    }
  }, [selectedSale?.id, effectiveOrgId, documents]);

  // Navigate between sales
  const currentIndex = pendingSales.findIndex(s => s.id === selectedSaleId);
  const goToPrev = () => {
    if (currentIndex > 0) setSelectedSaleId(pendingSales[currentIndex - 1].id);
  };
  const goToNext = () => {
    if (currentIndex < pendingSales.length - 1) setSelectedSaleId(pendingSales[currentIndex + 1].id);
  };

  // Build sale context for AI chat
  const saleContext = useMemo(() => {
    if (!selectedSale) return '';
    const calc = analysisResult?.calculadora;
    return [
      `NF-e: ${selectedSale.nfe_number || '-'}`,
      `Cliente: ${selectedSale.client_name || '-'} (CNPJ: ${selectedSale.client_cnpj || '-'})`,
      `Emitente: ${selectedSale.emitente_uf || '-'}`,
      `UF Destino: ${selectedSale.uf_destiny || '-'}`,
      `Valor Faturado: R$ ${(selectedSale.total_value || 0).toFixed(2)}`,
      `Produto: ${selectedSale.produto_descricao || '-'} | Modelo: ${selectedSale.produto_modelo || '-'} | Marca: ${selectedSale.produto_marca || '-'}`,
      `Pagamento: ${selectedSale.payment_method || 'não informado'}`,
      calc ? [
        `Valor Tabela: R$ ${calc.valor_tabela.toFixed(2)}`,
        `ICMS Tabela: ${calc.icms_tabela}% | ICMS Destino: ${calc.icms_destino.toFixed(0)}%`,
        `Valor Presente: R$ ${calc.valor_presente.toFixed(2)}`,
        `Entrada: R$ ${calc.valor_entrada.toFixed(2)}`,
        `Parcelas: ${calc.qtd_parcelas}x R$ ${calc.valor_parcela.toFixed(2)}`,
        `Over Price Bruto: R$ ${calc.over_price_bruto.toFixed(2)}`,
        `Dedução ICMS: R$ ${calc.deducao_icms.toFixed(2)}`,
        `Dedução PIS/COFINS: R$ ${calc.deducao_pis_cofins.toFixed(2)}`,
        `Dedução IR/CSLL: R$ ${calc.deducao_ir_csll.toFixed(2)}`,
        `Over Price Líquido: R$ ${calc.over_price_liquido.toFixed(2)}`,
        `Comissão Pedido: R$ ${calc.comissao_pedido.toFixed(2)}`,
        `Comissão Total: R$ ${calc.comissao_total.toFixed(2)} (${calc.percentual_final.toFixed(2)}%)`,
      ].join('\n') : 'Cálculos não disponíveis',
      analysisResult?.ia_commentary ? `Comentário IA: ${analysisResult.ia_commentary}` : '',
    ].filter(Boolean).join('\n');
  }, [selectedSale, analysisResult]);

  const handleApprove = () => {
    if (selectedSaleId) {
      navigate(`/aprovacao?saleId=${selectedSaleId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      {/* Toolbar */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Inbox de Pré-Aprovação</span>
              <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning/30 text-[10px]">
                {count}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedSale && (
              <>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                  <span>{currentIndex + 1} / {count}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev} disabled={currentIndex <= 0}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={currentIndex >= count - 1}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button size="sm" className="text-xs h-8" onClick={handleApprove} disabled={!selectedSaleId}>
              Abrir Aprovação
            </Button>
          </div>
        </div>
      </div>

      {/* Sale quick selector */}
      {!salesLoading && pendingSales.length > 1 && (
        <div className="border-b bg-muted/20 flex-shrink-0">
          <div className="container mx-auto px-4 py-1.5 flex gap-1.5 overflow-x-auto">
            {pendingSales.map((sale) => (
              <button
                key={sale.id}
                onClick={() => setSelectedSaleId(sale.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  sale.id === selectedSaleId
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-card border border-border/50 hover:bg-accent/50'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="font-mono">NFe {sale.nfe_number || '-'}</span>
                <span className="text-muted-foreground">{formatCurrency(sale.total_value || 0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main three-column layout */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {salesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma venda pendente</h2>
            <p className="text-muted-foreground">Todas as vendas foram processadas.</p>
          </div>
        ) : selectedSale ? (
          <div className="h-full grid grid-cols-[320px_1fr_340px] divide-x divide-border/50">
            {/* Column 1: Document Preview */}
            <div className="h-full overflow-hidden p-4">
              <DocumentPreview
                sale={selectedSale}
                documents={documents}
                boletos={analysisResult?.boletos || []}
              />
            </div>

            {/* Column 2: Auto Calculator */}
            <div className="h-full overflow-hidden p-4">
              <AutoCalculator
                calculadora={analysisResult?.calculadora || null}
                fipeMatch={analysisResult?.fipe_match || false}
                loading={analyzing}
              />
            </div>

            {/* Column 3: AI Analyst */}
            <div className="h-full overflow-hidden p-4">
              <AIAnalyst
                iaCommentary={analysisResult?.ia_commentary || null}
                saleContext={saleContext}
                analiseStatus={analysisResult?.analise_ia_status || selectedSale.analise_ia_status}
              />
            </div>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-border py-2 flex-shrink-0">
        <div className="container mx-auto px-6 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Kordian © 2026 — Sistema de Gestão de Comissões
          </p>
        </div>
      </footer>
    </div>
  );
}
