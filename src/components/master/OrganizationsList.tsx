import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Search, Eye, Users, ChevronLeft, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrganizationDetailSheet } from './OrganizationDetailSheet';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface OrganizationsListProps {
  organizations: Organization[];
  members: Record<string, OrganizationMember[]>;
  onToggleActive: (org: Organization) => void;
  onImpersonate: (org: Organization) => void;
  onOpenDialog: () => void;
}

type SortColumn = 'name' | 'slug' | 'created_at' | 'members' | 'active';
type SortDirection = 'asc' | 'desc' | null;

export function OrganizationsList({ 
  organizations, 
  members, 
  onToggleActive, 
  onImpersonate, 
  onOpenDialog 
}: OrganizationsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

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

  const filteredAndSortedOrgs = useMemo(() => {
    let result = [...organizations];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(org => 
        org.name.toLowerCase().includes(searchLower) || 
        org.slug.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(org => 
        statusFilter === 'active' ? org.active : !org.active
      );
    }

    // Sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'slug':
            comparison = a.slug.localeCompare(b.slug);
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'members':
            comparison = (members[a.id]?.length || 0) - (members[b.id]?.length || 0);
            break;
          case 'active':
            comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [organizations, search, statusFilter, sortColumn, sortDirection, members]);

  const totalPages = Math.ceil(filteredAndSortedOrgs.length / pageSize);
  const paginatedOrgs = filteredAndSortedOrgs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeCount = organizations.filter(o => o.active).length;
  const inactiveCount = organizations.length - activeCount;

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou slug..."
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
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({organizations.length})</SelectItem>
              <SelectItem value="active">Ativos ({activeCount})</SelectItem>
              <SelectItem value="inactive">Inativos ({inactiveCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onOpenDialog} className="shrink-0">
          <Building2 className="h-4 w-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredAndSortedOrgs.length} organização(ões) encontrada(s)
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
              <TableHead className="w-[200px]">
                <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('name')}>
                  Nome {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('slug')}>
                  Slug {getSortIcon('slug')}
                </Button>
              </TableHead>
              <TableHead className="w-[100px] text-center">
                <Button variant="ghost" size="sm" className="h-8 font-medium" onClick={() => handleSort('members')}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Membros {getSortIcon('members')}
                </Button>
              </TableHead>
              <TableHead className="w-[130px]">
                <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('created_at')}>
                  Criado em {getSortIcon('created_at')}
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button variant="ghost" size="sm" className="h-8 -ml-2 font-medium" onClick={() => handleSort('active')}>
                  Status {getSortIcon('active')}
                </Button>
              </TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhuma organização encontrada.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrgs.map((org) => {
                const orgMembers = members[org.id] || [];
                return (
                  <TableRow 
                    key={org.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrg(org)}
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{org.slug}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {orgMembers.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(org.created_at), 'dd MMM yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={org.active}
                          onCheckedChange={() => onToggleActive(org)}
                        />
                        <Badge variant={org.active ? 'default' : 'secondary'} className="text-xs">
                          {org.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onImpersonate(org)}
                        title="Visualizar como esta organização"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

      {/* Detail Sheet */}
      <OrganizationDetailSheet
        organization={selectedOrg}
        members={selectedOrg ? members[selectedOrg.id] || [] : []}
        open={!!selectedOrg}
        onOpenChange={(open) => !open && setSelectedOrg(null)}
        onImpersonate={onImpersonate}
        onToggleActive={onToggleActive}
      />
    </div>
  );
}
