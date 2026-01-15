import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ApprovalActionsProps {
  onApprove: () => Promise<void>;
  onReject: (motivo: string) => Promise<void>;
  disabled?: boolean;
  hasUnsavedChanges?: boolean;
}

export function ApprovalActions({ onApprove, onReject, disabled, hasUnsavedChanges }: ApprovalActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await onApprove();
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!motivoRejeicao.trim()) return;
    setLoading('reject');
    try {
      await onReject(motivoRejeicao);
      setRejectDialogOpen(false);
      setMotivoRejeicao('');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-background">
        <Button
          variant="destructive"
          size="lg"
          onClick={() => setRejectDialogOpen(true)}
          disabled={disabled || loading !== null}
          className="min-w-[140px]"
        >
          {loading === 'reject' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          Rejeitar
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={handleApprove}
          disabled={disabled || loading !== null}
          className="min-w-[140px] bg-success hover:bg-success/90"
        >
          {loading === 'approve' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Aprovar
        </Button>
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="motivo">Motivo da Rejeição *</Label>
            <Textarea
              id="motivo"
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === 'reject'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!motivoRejeicao.trim() || loading === 'reject'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading === 'reject' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
