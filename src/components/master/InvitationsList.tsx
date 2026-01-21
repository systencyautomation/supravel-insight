import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Search, Send, Trash2, ChevronLeft, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Clock, XCircle, Copy, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface Invitation {
  id: string;
  email: string;
  organization_name: string | null;
  status: string;
  created_at: string;
  token: string;
  last_sent_at: string;
  expires_at?: string;
}

interface InvitationsListProps {
  invitations: Invitation[];
  resendingId: string | null;
  deletingId: string | null;
  onResend: (invite: Invitation) => void;
  onDelete: (invite: Invitation) => void;
  onOpenDialog: () => void;
  getResendCooldown: (lastSentAt: string) => number;
}

type SortColumn = 'email' | 'organization_name' | 'status' | 'created_at' | 'last_sent_at';
type SortDirection = 'asc' | 'desc' | null;

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'aceito':
      return { icon: CheckCircle, label: 'Aceito', variant: 'default' as const, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    case 'expirado':
      return { icon: XCircle, label: 'Expirado', variant: 'destructive' as const, className: 'bg-destructive/10 text-destructive border-destructive/20' };
    default:
      return { icon: Clock, label: 'Pendente', variant: 'secondary' as const, className: 'bg-warning/10 text-warning border-warning/20' };
  }
};

export function InvitationsList({
  invitations,
  resendingId,
  deletingId,
  onResend,
  onDelete,
  onOpenDialog,
  getResendCooldown,
}: InvitationsListProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'aceito' | 'expirado'>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortColumn(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
    return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const filteredAndSortedInvites = useMemo(() => {
    let result = [...invitations];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(inv => 
        inv.email.toLowerCase().includes(searchLower) || 
        inv.organization_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case 'email':
            comparison = a.email.localeCompare(b.email);
            break;
          case 'organization_name':
            comparison = (a.organization_name || '').localeCompare(b.organization_name || '');
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'last_sent_at':
            comparison = new Date(a.last_sent_at).getTime() - new Date(b.last_sent_at).getTime();
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [invitations, search, statusFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedInvites.length / pageSize);
  const paginatedInvites = filteredAndSortedInvites.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = invitations.filter(i => i.status === 'pendente').length;
  const acceptedCount = invitations.filter(i => i.status === 'aceito').length;
  const expiredCount = invitations.filter(i => i.status === 'expirado').length;

  const copyInviteLink = (invite: Invitation) => {
    const link = `${window.location.origin}/onboarding?token=${invite.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link do convite foi copiado para a área de transferência.',
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou empresa..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9 w-[280px]"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({invitations.length})</SelectItem>
                <SelectItem value="pendente">Pendentes ({pendingCount})</SelectItem>
                <SelectItem value="aceito">Aceitos ({acceptedCount})</SelectItem>
                <SelectItem value="expirado">Expirados ({expiredCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={onOpenDialog} className="shrink-0">
            <Mail className="h-4 w-4 mr-2" />
            Novo Convite
          </Button>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredAndSortedInvites.length} convite(s) encontrado(s)
          </span>
          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / pág</SelectItem>
              <SelectItem value="25">25 / pág</SelectItem>
              <SelectItem value="50">50 / pág</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[220px]">
                  <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('email')}>
                    Email {getSortIcon('email')}
                  </Button>
                </TableHead>
                <TableHead className="w-[180px]">
                  <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('organization_name')}>
                    Empresa {getSortIcon('organization_name')}
                  </Button>
                </TableHead>
                <TableHead className="w-[110px]">
                  <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('status')}>
                    Status {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="w-[130px]">
                  <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('created_at')}>
                    Criado em {getSortIcon('created_at')}
                  </Button>
                </TableHead>
                <TableHead className="w-[130px]">
                  <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('last_sent_at')}>
                    Último Envio {getSortIcon('last_sent_at')}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhum convite encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvites.map((invite) => {
                  const status = getStatusConfig(invite.status);
                  const StatusIcon = status.icon;
                  const cooldown = getResendCooldown(invite.last_sent_at);
                  const isResending = resendingId === invite.id;
                  const isDeleting = deletingId === invite.id;

                  return (
                    <TableRow key={invite.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.organization_name || <span className="italic">Não definido</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${status.className}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(invite.created_at), 'dd MMM yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(invite.last_sent_at), { locale: ptBR, addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyInviteLink(invite)}
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar link</TooltipContent>
                          </Tooltip>

                          {invite.status === 'pendente' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onResend(invite)}
                                  disabled={isResending || cooldown > 0}
                                >
                                  {isResending ? (
                                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {cooldown > 0 ? `Aguarde ${cooldown} min` : 'Reenviar'}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDelete(invite)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
