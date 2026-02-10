import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/DashboardHeader';
import { usePendingSales } from '@/hooks/usePendingSales';
import { formatCurrency } from '@/lib/approvalCalculator';
import { format } from 'date-fns';

export default function Pendencias() {
  const navigate = useNavigate();
  const { pendingSales, count, loading } = usePendingSales();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            <span className="font-semibold text-lg">Vendas Pendentes</span>
            <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning/30">
              {count}
            </Badge>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma venda pendente</h2>
            <p className="text-muted-foreground">Todas as vendas foram processadas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingSales.map((sale) => (
              <Card
                key={sale.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(`/aprovacao?saleId=${sale.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-medium text-sm">
                          NFe {sale.nfe_number || '-'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {sale.client_name || 'Cliente não informado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      {sale.uf_destiny && (
                        <Badge variant="outline" className="text-xs">
                          {sale.uf_destiny}
                        </Badge>
                      )}
                      {sale.emission_date && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {format(new Date(sale.emission_date), 'dd/MM/yyyy')}
                        </span>
                      )}
                      <span className="font-semibold text-primary whitespace-nowrap">
                        {formatCurrency(sale.total_value || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-3 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Kordian © 2026 — Sistema de Gestão de Comissões
          </p>
        </div>
      </footer>
    </div>
  );
}
