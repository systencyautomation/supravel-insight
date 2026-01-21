import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Trash2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Invitation {
  id: string;
  email: string;
  organization_name: string | null;
  status: string;
  created_at: string;
  token: string;
  last_sent_at: string;
}

interface InvitationsCardProps {
  invitations: Invitation[];
  resendingId: string | null;
  deletingId: string | null;
  onResend: (invite: Invitation) => void;
  onDelete: (invite: Invitation) => void;
  onOpenDialog: () => void;
  getResendCooldown: (lastSentAt: string) => number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'aceito':
      return (
        <Badge variant="default" className="bg-success/10 text-success border-success/20 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    case 'expirado':
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
  }
}

export function InvitationsCard({
  invitations,
  resendingId,
  deletingId,
  onResend,
  onDelete,
  onOpenDialog,
  getResendCooldown,
}: InvitationsCardProps) {
  return (
    <Card className="overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Mail className="h-4 w-4 text-warning" />
            </div>
            Convites
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {invitations.filter(i => i.status === 'pendente').length} pendente{invitations.filter(i => i.status === 'pendente').length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenDialog}>
          <Send className="h-3 w-3 mr-1" />
          Enviar
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <TooltipProvider>
          {invitations.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                Nenhum convite enviado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Convide clientes para criar suas organizações
              </p>
              <Button size="sm" variant="outline" onClick={onOpenDialog}>
                <Send className="h-3 w-3 mr-1" />
                Enviar Convite
              </Button>
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs w-[35%]">Email</TableHead>
                  <TableHead className="text-xs hidden md:table-cell w-[25%]">Empresa</TableHead>
                  <TableHead className="text-xs text-center w-[15%]">Status</TableHead>
                  <TableHead className="text-xs text-right w-[25%]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => {
                  const cooldown = getResendCooldown(invite.last_sent_at);
                  const isResending = resendingId === invite.id;
                  const canResend = invite.status === 'pendente' && cooldown === 0;

                  return (
                    <TableRow key={invite.id} className="group">
                      <TableCell className="font-mono text-xs min-w-0">
                        <span className="truncate block">{invite.email}</span>
                        <span className="text-muted-foreground text-[10px] md:hidden truncate block">
                          {invite.organization_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell min-w-0">
                        <span className="truncate block">{invite.organization_name || '—'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(invite.status || 'pendente')}
                      </TableCell>
                      <TableCell className="text-right">
                        {invite.status === 'pendente' && (
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onResend(invite)}
                                  disabled={!canResend || isResending}
                                  className="text-xs"
                                >
                                  {isResending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                  {cooldown > 0 && (
                                    <span className="ml-1 text-muted-foreground">{cooldown}m</span>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {cooldown > 0 
                                  ? `Aguarde ${cooldown} minuto(s)` 
                                  : 'Reenviar convite'
                                }
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDelete(invite)}
                                  disabled={deletingId === invite.id}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  {deletingId === invite.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remover convite</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
