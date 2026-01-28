import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSalesWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useSalesMetrics, SaleWithDetails } from '@/hooks/useSalesMetrics';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommissionsTab } from '@/components/tabs/CommissionsTab';
import { StockManagement } from '@/components/tabs/StockManagement';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { EmpresaOverview } from '@/components/empresa/EmpresaOverview';
import { EmpresaVendas } from '@/components/empresa/EmpresaVendas';
import { EmpresaRecebimentos } from '@/components/empresa/EmpresaRecebimentos';
import { Building2, DollarSign, Package, Loader2, ArrowLeft, LayoutDashboard, ListFilter, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfMonth, endOfMonth } from 'date-fns';

const Index = () => {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    label: 'Este Mês',
  });
  
  const { 
    user, 
    loading: authLoading, 
    isMasterAdmin, 
    impersonatedOrgName, 
    setImpersonatedOrg 
  } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { sales: salesWithCalculations, loading: dataLoading, refetch } = useSalesWithCalculations();
  const navigate = useNavigate();

  // Permissões baseadas no cargo
  const canViewDashboard = hasPermission('view_dashboard');
  const canViewCommissions = hasPermission('view_commissions');
  const canManageInventory = hasPermission('manage_inventory');

  // Cast sales to extended type for metrics and charts
  const salesWithDetails = salesWithCalculations as unknown as SaleWithDetails[];
  const metrics = useSalesMetrics(salesWithDetails, { start: dateRange.start, end: dateRange.end });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!authLoading && user && isMasterAdmin && !impersonatedOrgName) {
      navigate('/master');
    }
  }, [user, authLoading, isMasterAdmin, impersonatedOrgName, navigate]);

  const handleExitImpersonation = () => {
    setImpersonatedOrg(null, null);
    navigate('/master');
  };

  // Determinar aba inicial baseado em permissões
  const getDefaultTab = () => {
    if (canViewDashboard) return 'empresa';
    if (canViewCommissions) return 'comissoes';
    if (canManageInventory) return 'tabela';
    return 'empresa';
  };

  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      
      {impersonatedOrgName && (
        <div className="container mx-auto px-6 py-2">
          <Button variant="outline" size="sm" onClick={handleExitImpersonation} className="gap-2 text-xs">
            <ArrowLeft className="h-3 w-3" />
            Sair de {impersonatedOrgName}
          </Button>
        </div>
      )}
      
      <main className="container mx-auto px-6 py-6 flex-1">
        <Tabs value={activeTab || getDefaultTab()} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full h-auto p-0 bg-transparent gap-1`} style={{ gridTemplateColumns: `repeat(${[canViewDashboard, canViewCommissions, canManageInventory].filter(Boolean).length}, 1fr)` }}>
            {canViewDashboard && (
              <TabsTrigger value="empresa" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empresa</span>
              </TabsTrigger>
            )}
            {canViewCommissions && (
              <TabsTrigger value="comissoes" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Comissões</span>
              </TabsTrigger>
            )}
            {canManageInventory && (
              <TabsTrigger value="tabela" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Tabela</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="vendas" className="gap-2">
                  <ListFilter className="h-4 w-4" />
                  Vendas
                </TabsTrigger>
                <TabsTrigger value="recebimentos" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  Recebimentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <EmpresaOverview
                  salesWithDetails={salesWithDetails}
                  metrics={metrics}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  loading={dataLoading}
                />
              </TabsContent>

              <TabsContent value="vendas">
                <EmpresaVendas
                  sales={salesWithCalculations}
                  loading={dataLoading}
                  onRefresh={refetch}
                />
              </TabsContent>

              <TabsContent value="recebimentos">
                <EmpresaRecebimentos
                  sales={salesWithCalculations}
                  loading={dataLoading}
                  onRefresh={refetch}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="comissoes" className="mt-6">
            <CommissionsTab />
          </TabsContent>

          <TabsContent value="tabela" className="mt-6">
            <StockManagement />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-3 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Connect CRM © 2026 — Sistema de Gestão de Comissões
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
