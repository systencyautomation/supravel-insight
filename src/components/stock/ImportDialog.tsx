import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDropzone } from './FileDropzone';
import { ColumnMapper } from './ColumnMapper';
import { ImportResult } from './ImportResult';
import { PdfProcessingStatus } from './PdfProcessingStatus';
import { useInventoryImport, type ImportResult as ImportResultType } from '@/hooks/useInventoryImport';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'processing' | 'mapping' | 'result';

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [result, setResult] = useState<ImportResultType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfComplete, setPdfComplete] = useState(false);
  
  const {
    parseFile,
    importItems,
    reset,
    parsedData,
    mapping,
    setMapping,
    isImporting,
    isParsing,
  } = useInventoryImport();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      setStep('processing');
    }
    
    try {
      await parseFile(file);
      if (isPdf) {
        setPdfComplete(true);
      } else {
        setStep('mapping');
      }
    } catch (error) {
      toast.error('Erro ao ler arquivo', {
        description: error instanceof Error ? error.message : 'Formato inválido',
      });
      setSelectedFile(null);
      setStep('upload');
      setPdfComplete(false);
    }
  };

  const handleImport = async () => {
    try {
      const importResult = await importItems();
      setResult(importResult);
      setStep('result');
      
      if (importResult.errors.length === 0) {
        toast.success('Importação concluída com sucesso!');
      } else {
        toast.warning('Importação concluída com alguns erros');
      }
      
      onSuccess();
    } catch (error) {
      toast.error('Erro na importação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const handleClose = () => {
    setStep('upload');
    setResult(null);
    setSelectedFile(null);
    setPdfComplete(false);
    reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'mapping') {
      setStep('upload');
      setSelectedFile(null);
      setPdfComplete(false);
      reset();
    } else if (step === 'processing') {
      setStep('upload');
      setSelectedFile(null);
      setPdfComplete(false);
      reset();
    }
  };

  const handleContinueToMapping = () => {
    setStep('mapping');
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importar Tabela FIPE'}
            {step === 'processing' && 'Processando PDF'}
            {step === 'mapping' && 'Mapear Colunas'}
            {step === 'result' && 'Resultado da Importação'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo Excel, CSV ou PDF com os dados do estoque'}
            {step === 'processing' && 'Extraindo dados do PDF com inteligência artificial'}
            {step === 'mapping' && 'Associe as colunas da planilha aos campos do sistema'}
            {step === 'result' && 'Veja o resultado da importação'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropzone 
                onFileSelect={handleFileSelect} 
                isPdfProcessing={false}
              />
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">💡 Dica</h4>
                <p className="text-xs text-muted-foreground">
                  Agora você pode importar diretamente arquivos PDF! A IA vai extrair os dados automaticamente.
                </p>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <PdfProcessingStatus
              isParsing={isParsing}
              isComplete={pdfComplete}
              rowCount={parsedData?.rows.length || 0}
              onContinue={handleContinueToMapping}
            />
          )}

          {step === 'mapping' && parsedData && (
            <ColumnMapper
              headers={parsedData.headers}
              rows={parsedData.rows}
              mapping={mapping}
              onMappingChange={setMapping}
            />
          )}

          {step === 'result' && result && (
            <ImportResult
              total={result.total}
              inserted={result.inserted}
              updated={result.updated}
              errors={result.errors}
              onClose={handleClose}
            />
          )}
        </div>

        {step !== 'result' && step !== 'processing' && (
          <div className="flex justify-between">
            <div>
              {step === 'mapping' && (
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                {step === 'upload' ? 'Fechar' : 'Cancelar'}
              </Button>
              {step === 'mapping' && (
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      Confirmar Importação
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && !pdfComplete && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
