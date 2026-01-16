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
import { useFipeDocument, type ImportResult } from '@/hooks/useFipeDocument';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const { uploadDocument, isUploading, reset } = useFipeDocument();

  const handleFileSelect = async (file: File) => {
    try {
      const importResult = await uploadDocument(file);
      setResult(importResult);
      toast.success('Planilha importada com sucesso!', {
        description: `${importResult.rowCount} linhas importadas`,
      });
      onSuccess();
    } catch (error) {
      toast.error('Erro ao importar arquivo', {
        description: error instanceof Error ? error.message : 'Formato inválido',
      });
    }
  };

  const handleClose = () => {
    setResult(null);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {result ? 'Importação Concluída' : 'Importar Tabela FIPE'}
          </DialogTitle>
          <DialogDescription>
            {result 
              ? 'A planilha foi importada com sucesso' 
              : 'Faça upload de um arquivo Excel ou CSV com os dados da tabela'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {result ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium">{result.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {result.rowCount} linhas importadas
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Importando planilha...</p>
                </div>
              ) : (
                <>
                  <FileDropzone 
                    onFileSelect={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                  />
                  
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      📄 Arquivo em PDF?
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                      Converta seu PDF para Excel antes de importar. Use o conversor gratuito da Adobe:
                    </p>
                    <a 
                      href="https://www.adobe.com/br/acrobat/online/pdf-to-excel.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Converter PDF para Excel (Adobe)
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!result && !isUploading && (
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
