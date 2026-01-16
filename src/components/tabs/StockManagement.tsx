import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ImportDialog } from '@/components/stock/ImportDialog';
import { SpreadsheetViewer } from '@/components/stock/SpreadsheetViewer';
import { useFipeDocument, type FipeDocument } from '@/hooks/useFipeDocument';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function StockManagement() {
  const [document, setDocument] = useState<FipeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { effectiveOrgId } = useAuth();
  const { fetchLatestDocument } = useFipeDocument();

  const loadDocument = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }
    
    try {
      const doc = await fetchLatestDocument();
      setDocument(doc);
    } catch (error) {
      console.error('Error fetching FIPE document:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, fetchLatestDocument]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleImportSuccess = () => {
    loadDocument();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tabela FIPE</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Documento oficial - somente consulta
          </p>
          {document && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {format(new Date(document.uploadedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
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

      <div>
        {loading ? (
          <div className="border border-border p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : document ? (
          <SpreadsheetViewer
            gridData={document.gridData}
            colCount={document.colCount}
            rowCount={document.rowCount}
            fileName={document.fileName}
          />
        ) : (
          <div className="border border-border p-8 text-center">
            <p className="text-muted-foreground">Nenhuma planilha importada</p>
            <p className="text-xs text-muted-foreground mt-2">
              Importe um arquivo Excel para visualizar a tabela FIPE
            </p>
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
