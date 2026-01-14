import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyCommissions } from '@/components/tabs/CompanyCommissions';
import { InternalSellerCommissions } from '@/components/tabs/InternalSellerCommissions';
import { RepresentativeCommissions } from '@/components/tabs/RepresentativeCommissions';
import { StockManagement } from '@/components/tabs/StockManagement';
import { CashFlow } from '@/components/tabs/CashFlow';
import { Integrations } from '@/components/tabs/Integrations';
import { mockSales } from '@/data/mockData';
import { Building2, Users, Briefcase, Package, Wallet, Loader2, LogOut, Settings, ArrowLeft, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState('empresa');
  const { 
    user, 
    loading: authLoading, 
    signOut, 
    isMasterAdmin, 
    impersonatedOrgName, 
    setImpersonatedOrg 
  } = useAuth();
  const { sales, inventory, installments, loading: dataLoading } = useOrganizationData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Redirect Master Admin to master dashboard if not impersonating
    if (!authLoading && user && isMasterAdmin && !impersonatedOrgName) {
      navigate('/master');
    }
  }, [user, authLoading, isMasterAdmin, impersonatedOrgName, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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

  if (!user) {
    return null;
  }

  // Use mock data for now if no real data from database
  const displaySales = sales.length > 0 ? sales.map(s => ({
    id: s.id,
    cliente: s.client_name || '',
    nfe: s.nfe_number || '',
    valorTotal: s.total_value || 0,
    valorTabela: s.table_value || 0,
    uf: s.uf_destiny || 'SP',
    formaPagamento: (s.payment_method === 'avista' ? 'avista' : 'boleto') as 'boleto' | 'avista',
    status: (s.status || 'pendente') as 'pago' | 'pendente' | 'parcial',
    dataEmissao: s.emission_date || new Date().toISOString(),
    vendedorInterno: '',
    representante: '',
  })) : mockSales;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <div>
          {impersonatedOrgName && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExitImpersonation}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="h-3 w-3" />
              Sair de {impersonatedOrgName}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMasterAdmin && (
            <Link to="/master">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Master
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
      
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto p-0 bg-transparent gap-1">
            <TabsTrigger 
              value="empresa" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger 
              value="interno" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Vendedor</span>
            </TabsTrigger>
            <TabsTrigger 
              value="representante" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Representante</span>
            </TabsTrigger>
            <TabsTrigger 
              value="estoque" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fluxo" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Fluxo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="integracoes" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <CompanyCommissions sales={displaySales} />
          </TabsContent>

          <TabsContent value="interno" className="mt-6">
            <InternalSellerCommissions sales={displaySales} />
          </TabsContent>

          <TabsContent value="representante" className="mt-6">
            <RepresentativeCommissions sales={displaySales} />
          </TabsContent>

          <TabsContent value="estoque" className="mt-6">
            <StockManagement />
          </TabsContent>

          <TabsContent value="fluxo" className="mt-6">
            <CashFlow installments={installments} loading={dataLoading} />
          </TabsContent>

          <TabsContent value="integracoes" className="mt-6">
            <Integrations />
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
