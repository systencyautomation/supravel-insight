import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportResultProps {
  total: number;
  inserted: number;
  updated: number;
  errors: { row: number; message: string }[];
  onClose: () => void;
}

export function ImportResult({ total, inserted, updated, errors, onClose }: ImportResultProps) {
  const hasErrors = errors.length > 0;
  const success = inserted + updated;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        {hasErrors ? (
          <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        ) : (
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
        )}
        <h3 className="text-lg font-semibold">
          {hasErrors ? 'Importação Concluída com Avisos' : 'Importação Concluída!'}
        </h3>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total processado</span>
          <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Inseridos com sucesso
          </span>
          <span className="font-medium text-green-600">{inserted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            Atualizados (já existiam)
          </span>
          <span className="font-medium text-blue-600">{updated}</span>
        </div>
        {hasErrors && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Erros
            </span>
            <span className="font-medium text-destructive">{errors.length}</span>
          </div>
        )}
      </div>
      
      {hasErrors && (
        <div>
          <h4 className="text-sm font-medium mb-2">Detalhes dos Erros</h4>
          <ScrollArea className="h-[150px] border rounded-lg">
            <div className="p-3 space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-sm flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Linha {error.row}:</strong> {error.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      <div className="flex justify-center">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
