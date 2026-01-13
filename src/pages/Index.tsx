import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyCommissions } from '@/components/tabs/CompanyCommissions';
import { InternalSellerCommissions } from '@/components/tabs/InternalSellerCommissions';
import { RepresentativeCommissions } from '@/components/tabs/RepresentativeCommissions';
import { StockManagement } from '@/components/tabs/StockManagement';
import { mockSales } from '@/data/mockData';
import { Building2, Users, Briefcase, Package } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('empresa');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-transparent gap-1">
            <TabsTrigger 
              value="empresa" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Comissões Empresa</span>
              <span className="sm:hidden">Empresa</span>
            </TabsTrigger>
            <TabsTrigger 
              value="interno" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Vendedor Interno</span>
              <span className="sm:hidden">Interno</span>
            </TabsTrigger>
            <TabsTrigger 
              value="representante" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Representante</span>
              <span className="sm:hidden">Rep.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="estoque" 
              className="data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary border border-border bg-muted/30 rounded-none px-4 py-3 flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Gestão Estoque</span>
              <span className="sm:hidden">Estoque</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <CompanyCommissions sales={mockSales} />
          </TabsContent>

          <TabsContent value="interno" className="mt-6">
            <InternalSellerCommissions sales={mockSales} />
          </TabsContent>

          <TabsContent value="representante" className="mt-6">
            <RepresentativeCommissions sales={mockSales} />
          </TabsContent>

          <TabsContent value="estoque" className="mt-6">
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
