import { useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, ArrowDown, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/approvalCalculator';

interface CalculadoraData {
  valor_tabela: number;
  percentual_comissao: number;
  icms_tabela: number;
  icms_destino: number;
  valor_faturado: number;
  valor_entrada: number;
  qtd_parcelas: number;
  valor_parcela: number;
  valor_presente: number;
  over_price_bruto: number;
  deducao_icms: number;
  deducao_pis_cofins: number;
  deducao_ir_csll: number;
  over_price_liquido: number;
  comissao_pedido: number;
  comissao_total: number;
  percentual_final: number;
}

interface AutoCalculatorProps {
  calculadora: CalculadoraData | null;
  fipeMatch: boolean;
  loading?: boolean;
}

function Row({ label, value, mono = true, variant, sub }: { 
  label: string; 
  value: string; 
  mono?: boolean; 
  variant?: 'primary' | 'destructive' | 'success' | 'muted';
  sub?: boolean;
}) {
  const colorClass = variant === 'primary' ? 'text-primary' 
    : variant === 'destructive' ? 'text-destructive' 
    : variant === 'success' ? 'text-[hsl(var(--success))]' 
    : variant === 'muted' ? 'text-muted-foreground' 
    : '';

  return (
    <div className={`flex justify-between items-center ${sub ? 'pl-3 text-xs' : 'text-xs'}`}>
      <span className={`${variant === 'muted' || sub ? 'text-muted-foreground' : ''}`}>
        {sub && <ArrowDown className="h-2.5 w-2.5 inline mr-1" />}
        {label}
      </span>
      <span className={`${mono ? 'font-mono' : ''} ${colorClass} ${sub ? '' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

export function AutoCalculator({ calculadora, fipeMatch, loading }: AutoCalculatorProps) {
  const isOverNegativo = (calculadora?.over_price_bruto ?? 0) < 0;
  const jurosEmbutidos = useMemo(() => {
    if (!calculadora || calculadora.qtd_parcelas <= 0) return 0;
    const totalParcelado = calculadora.valor_entrada + (calculadora.qtd_parcelas * calculadora.valor_parcela);
    return totalParcelado - calculadora.valor_presente;
  }, [calculadora]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!calculadora) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Calculator className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Selecione uma venda para ver os cálculos</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Calculadora</span>
          </div>
          <Badge variant={fipeMatch ? 'secondary' : 'destructive'} className="text-[10px]">
            {fipeMatch ? 'Match FIPE ✓' : 'Sem FIPE'}
          </Badge>
        </div>

        {/* Dados da Tabela */}
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Tabela</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            <Row label="Valor Tabela" value={formatCurrency(calculadora.valor_tabela)} variant="primary" />
            <Row label="Comissão Base" value={`${calculadora.percentual_comissao}%`} />
            <Row label="ICMS Tabela" value={`${calculadora.icms_tabela}%`} />
          </CardContent>
        </Card>

        {/* Dados da NF */}
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Nota Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            <Row label="Valor Faturado" value={formatCurrency(calculadora.valor_faturado)} variant="primary" />
            <Row label="ICMS Destino" value={`${calculadora.icms_destino.toFixed(0)}%`} />
          </CardContent>
        </Card>

        {/* Parcelamento */}
        {calculadora.qtd_parcelas > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Parcelamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-3">
              <Row label="Entrada" value={formatCurrency(calculadora.valor_entrada)} />
              <Row label="Parcelas" value={`${calculadora.qtd_parcelas}x ${formatCurrency(calculadora.valor_parcela)}`} />
              
              <Separator className="bg-border/30 my-1" />
              
              <Row label="Valor Presente (VP)" value={formatCurrency(calculadora.valor_presente)} variant="primary" />
              <Row label="Custo Financeiro" value={`- ${formatCurrency(jurosEmbutidos)}`} variant="muted" sub />
              <Row label="Taxa" value="2,2% a.m." variant="muted" sub />
            </CardContent>
          </Card>
        )}

        {/* Over Price */}
        <Card className={`border-border/50 ${isOverNegativo ? 'border-destructive/30' : ''}`}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              {isOverNegativo ? <TrendingDown className="h-3 w-3 text-destructive" /> : <TrendingUp className="h-3 w-3 text-[hsl(var(--success))]" />}
              Over Price
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            <Row 
              label="Over Bruto" 
              value={formatCurrency(calculadora.over_price_bruto)} 
              variant={isOverNegativo ? 'destructive' : 'success'}
            />
            
            {calculadora.over_price_bruto > 0 && (
              <>
                <Separator className="bg-border/30 my-1" />
                <Row label={`ICMS (${calculadora.icms_destino.toFixed(0)}%)`} value={`- ${formatCurrency(calculadora.deducao_icms)}`} variant="muted" sub />
                <Row label="PIS/COFINS (9,25%)" value={`- ${formatCurrency(calculadora.deducao_pis_cofins)}`} variant="muted" sub />
                <Row label="IR/CSLL (34%)" value={`- ${formatCurrency(calculadora.deducao_ir_csll)}`} variant="muted" sub />
                <Separator className="bg-border/30 my-1" />
                <Row 
                  label="Over Líquido" 
                  value={formatCurrency(calculadora.over_price_liquido)} 
                  variant="success"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Comissão Total */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="h-3 w-3" />
              Comissão Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            <Row label="Comissão Pedido" value={formatCurrency(calculadora.comissao_pedido)} />
            <Row label="+ Over Líquido" value={formatCurrency(calculadora.over_price_liquido)} variant="muted" sub />
            <Separator className="bg-border/30 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {calculadora.percentual_final.toFixed(2)}%
                </Badge>
                <span className="font-mono font-bold text-sm text-primary">
                  {formatCurrency(calculadora.comissao_total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
