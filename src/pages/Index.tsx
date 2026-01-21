import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useSalesMetrics, SaleWithDetails } from '@/hooks/useSalesMetrics';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommissionsTab } from '@/components/tabs/CommissionsTab';
import { StockManagement } from '@/components/tabs/StockManagement';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { EmpresaSidebar, EmpresaView } from '@/components/empresa/EmpresaSidebar';
import { EmpresaOverview } from '@/components/empresa/EmpresaOverview';
import { EmpresaVendas } from '@/components/empresa/EmpresaVendas';
import { EmpresaEquipe } from '@/components/empresa/EmpresaEquipe';
import { Building2, DollarSign, Package, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfMonth, endOfMonth } from 'date-fns';

const Index = () => {
  const [activeTab, setActiveTab] = useState('empresa');
  const [empresaView, setEmpresaView] = useState<EmpresaView>('overview');
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
  const { sales: salesWithCalculations, loading: dataLoading, refetch } = useSalesWithCalculations();
  const navigate = useNavigate();

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // Map for legacy CommissionsTab component
  const displaySales = salesWithCalculations.map(s => ({
    id: s.id,
    cliente: s.client_name || '',
    nfe: s.nfe_number || '',
    valorTotal: Number(s.total_value) || 0,
    valorTabela: Number(s.table_value) || 0,
    uf: s.uf_destiny || 'SP',
    formaPagamento: (s.payment_method === 'avista' ? 'avista' : 'boleto') as 'boleto' | 'avista',
    status: (s.status || 'pendente') as 'pago' | 'pendente' | 'parcial',
    dataEmissao: s.emission_date || new Date().toISOString(),
    vendedorInterno: '',
    representante: '',
  }));

  const renderEmpresaContent = () => {
    switch (empresaView) {
      case 'overview':
        return (
          <EmpresaOverview
            salesWithDetails={salesWithDetails}
            salesWithCalculations={salesWithCalculations}
            metrics={metrics}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            loading={dataLoading}
            onNavigateToVendas={() => setEmpresaView('vendas')}
          />
        );
      case 'vendas':
        return (
          <EmpresaVendas
            sales={salesWithCalculations}
            loading={dataLoading}
            onRefresh={refetch}
          />
        );
      case 'gerentes':
      case 'vendedores':
      case 'representantes':
        return <EmpresaEquipe view={empresaView} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {impersonatedOrgName && (
        <div className="container mx-auto px-6 py-2">
          <Button variant="outline" size="sm" onClick={handleExitImpersonation} className="gap-2 text-xs">
            <ArrowLeft className="h-3 w-3" />
            Sair de {impersonatedOrgName}
          </Button>
        </div>
      )}
      
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent gap-1">
            <TabsTrigger value="empresa" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="comissoes" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Comissões</span>
            </TabsTrigger>
            <TabsTrigger value="tabela" className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Tabela</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <div className="flex gap-6">
              <EmpresaSidebar activeView={empresaView} onViewChange={setEmpresaView} />
              <div className="flex-1 min-w-0">
                {renderEmpresaContent()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comissoes" className="mt-6">
            <CommissionsTab sales={displaySales} />
          </TabsContent>

          <TabsContent value="tabela" className="mt-6">
            <StockManagement />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Supravel © 2025 — Sistema de Gestão de Comissões
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
