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
import { useInventoryImport, type ImportResult as ImportResultType } from '@/hooks/useInventoryImport';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'result';

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [result, setResult] = useState<ImportResultType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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
    try {
      await parseFile(file);
      setStep('mapping');
    } catch (error) {
      toast.error('Erro ao ler arquivo', {
        description: error instanceof Error ? error.message : 'Formato inválido',
      });
      setSelectedFile(null);
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
    reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'mapping') {
      setStep('upload');
      setSelectedFile(null);
      reset();
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importar Tabela FIPE'}
            {step === 'mapping' && 'Mapear Colunas'}
            {step === 'result' && 'Resultado da Importação'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo Excel, CSV ou PDF com os dados do estoque'}
            {step === 'mapping' && 'Associe as colunas da planilha aos campos do sistema'}
            {step === 'result' && 'Veja o resultado da importação'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropzone 
                onFileSelect={handleFileSelect} 
                isPdfProcessing={isParsing}
              />
              
              {isParsing && (
                <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">Processando PDF com IA...</p>
                    <p className="text-xs text-muted-foreground">
                      Isso pode levar alguns segundos
                    </p>
                  </div>
                </div>
              )}
              
              {!isParsing && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">💡 Dica</h4>
                  <p className="text-xs text-muted-foreground">
                    Agora você pode importar diretamente arquivos PDF! A IA vai extrair os dados automaticamente.
                  </p>
                </div>
              )}
            </div>
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

        {step !== 'result' && (
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
                Cancelar
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
      </DialogContent>
    </Dialog>
  );
}
