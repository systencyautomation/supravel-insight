import { useState, useEffect, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { calculateApprovalCommission, formatCurrency, getIcmsRate } from '@/lib/approvalCalculator';
import type { PendingSale } from '@/hooks/usePendingSales';

interface CommissionCalculatorProps {
  sale: PendingSale | null;
  onCalculationChange: (data: CalculationData) => void;
}

export interface CalculationData {
  valorTabela: number;
  percentualComissao: number;
  icmsTabela: number;
  icmsDestino: number;
  tipoPagamento: string;
  overPrice: number;
  overPriceLiquido: number;
  comissaoTotal: number;
  percentualFinal: number;
  valorEntrada: number;
  qtdParcelas: number;
  valorParcela: number;
}

export function CommissionCalculator({ 
  sale, 
  onCalculationChange 
}: CommissionCalculatorProps) {
  // Dados da Tabela
  const [valorTabela, setValorTabela] = useState(0);
  const [icmsTabela, setIcmsTabela] = useState(12);
  const [percentualComissao, setPercentualComissao] = useState(0);

  // Dados da Nota Fiscal
  const [valorFaturado, setValorFaturado] = useState(0);
  const [icmsDestino, setIcmsDestino] = useState(12);

  // Parcelamento
  const [tipoPagamento, setTipoPagamento] = useState('a_vista');
  const [valorEntrada, setValorEntrada] = useState(0);
  const [qtdParcelas, setQtdParcelas] = useState(0);

  // Over Price editing
  const [editingOverPrice, setEditingOverPrice] = useState(false);
  const [manualOverPrice, setManualOverPrice] = useState<number | null>(null);

  // Update from sale
  useEffect(() => {
    if (sale) {
      setValorFaturado(sale.total_value || 0);
      setIcmsDestino((sale.percentual_icms || getIcmsRate(sale.uf_destiny || '') * 100));
      setIcmsTabela(getIcmsRate(sale.emitente_uf || 'SP') * 100);
      setTipoPagamento(sale.payment_method || 'a_vista');
      if (sale.table_value) setValorTabela(sale.table_value);
      if (sale.percentual_comissao) setPercentualComissao(sale.percentual_comissao);
      setValorEntrada(sale.valor_entrada || 0);
      
      // Parse payment_method for parcelas
      const paymentMethod = sale.payment_method || '';
      const parcelasMatch = paymentMethod.match(/(\d+)/);
      if (parcelasMatch) {
        setQtdParcelas(parseInt(parcelasMatch[1], 10));
      } else {
        setQtdParcelas(0);
      }
    }
  }, [sale]);

  // Calculate commission
  const calculation = useMemo(() => {
    if (!valorFaturado) return null;

    return calculateApprovalCommission({
      valorNF: valorFaturado,
      valorTabela,
      percentualComissao,
      icmsOrigem: icmsTabela / 100,
      icmsDestino: icmsDestino / 100,
    });
  }, [valorFaturado, valorTabela, percentualComissao, icmsTabela, icmsDestino]);

  // Use manual over price if set
  const effectiveOverPrice = manualOverPrice !== null ? manualOverPrice : (calculation?.overPrice || 0);

  // Recalculate with manual over price
  const finalCalculation = useMemo(() => {
    if (!calculation || manualOverPrice === null) return calculation;

    const overPrice = manualOverPrice;
    let deducaoIcms = 0;
    let deducaoPisCofins = 0;
    let deducaoIrCsll = 0;
    let overLiquido = 0;

    if (overPrice > 0) {
      deducaoIcms = overPrice * (icmsDestino / 100);
      const subtotalAposIcms = overPrice - deducaoIcms;
      deducaoPisCofins = subtotalAposIcms * 0.0925;
      const subtotalAposPisCofins = subtotalAposIcms - deducaoPisCofins;
      deducaoIrCsll = subtotalAposPisCofins * 0.34;
      overLiquido = subtotalAposPisCofins - deducaoIrCsll;
    } else {
      overLiquido = overPrice;
    }

    const comissaoPedido = (percentualComissao / 100) * valorTabela;
    const comissaoTotal = comissaoPedido + overLiquido;
    const percentualFinal = valorFaturado ? (comissaoTotal / valorFaturado) * 100 : 0;

    return {
      ...calculation,
      overPrice: manualOverPrice,
      deducaoIcms,
      deducaoPisCofins,
      deducaoIrCsll,
      overLiquido,
      comissaoPedido,
      comissaoTotal,
      percentualFinal,
    };
  }, [calculation, manualOverPrice, icmsDestino, percentualComissao, valorTabela, valorFaturado]);

  const activeCalculation = finalCalculation || calculation;

  // Calculate valor da parcela
  const valorParcela = useMemo(() => {
    if (qtdParcelas <= 0) return 0;
    const valorRestante = valorFaturado - valorEntrada;
    return valorRestante / qtdParcelas;
  }, [valorFaturado, valorEntrada, qtdParcelas]);

  // Notify parent of changes
  useEffect(() => {
    if (activeCalculation) {
      onCalculationChange({
        valorTabela,
        percentualComissao,
        icmsTabela,
        icmsDestino,
        tipoPagamento,
        overPrice: activeCalculation.overPrice,
        overPriceLiquido: activeCalculation.overLiquido,
        comissaoTotal: activeCalculation.comissaoTotal,
        percentualFinal: activeCalculation.percentualFinal,
        valorEntrada,
        qtdParcelas,
        valorParcela,
      });
    }
  }, [activeCalculation, valorTabela, percentualComissao, icmsTabela, icmsDestino, tipoPagamento, valorEntrada, qtdParcelas, valorParcela, onCalculationChange]);

  if (!sale) {
    return (
      <Card className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Selecione uma venda para calcular</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="text-lg">Calculadora de Comissão</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-5">
            {/* Dados da Tabela */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados da Tabela
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valorTabela" className="text-xs">Valor Tabela à Vista</Label>
                  <Input
                    id="valorTabela"
                    type="number"
                    value={valorTabela}
                    onChange={(e) => setValorTabela(parseFloat(e.target.value) || 0)}
                    className="font-mono h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="icmsTabela" className="text-xs">% Icms</Label>
                  <Input
                    id="icmsTabela"
                    type="number"
                    step="1"
                    value={icmsTabela}
                    onChange={(e) => setIcmsTabela(parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="percentualComissao" className="text-xs">% Comissão</Label>
                  <Input
                    id="percentualComissao"
                    type="number"
                    step="0.5"
                    value={percentualComissao}
                    onChange={(e) => setPercentualComissao(parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados da Nota Fiscal */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados da Nota Fiscal
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valorFaturado" className="text-xs">Valor Faturado Nota Fiscal</Label>
                  <Input
                    id="valorFaturado"
                    type="number"
                    value={valorFaturado}
                    onChange={(e) => setValorFaturado(parseFloat(e.target.value) || 0)}
                    className="font-mono h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="icmsDestino" className="text-xs">% Icms</Label>
                  <Input
                    id="icmsDestino"
                    type="number"
                    step="1"
                    value={icmsDestino}
                    onChange={(e) => setIcmsDestino(parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Parcelamento */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Parcelamento
              </h3>
              <RadioGroup 
                value={tipoPagamento} 
                onValueChange={setTipoPagamento}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a_vista" id="a_vista" />
                  <Label htmlFor="a_vista" className="text-sm font-normal">À Vista</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcelado_boleto" id="parcelado_boleto" />
                  <Label htmlFor="parcelado_boleto" className="text-sm font-normal">Parcelado Boleto</Label>
                </div>
              </RadioGroup>
              
              {tipoPagamento === 'parcelado_boleto' && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="valorEntrada" className="text-xs">Entrada R$</Label>
                    <Input
                      id="valorEntrada"
                      type="number"
                      value={valorEntrada}
                      onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
                      className="font-mono h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qtdParcelas" className="text-xs">Número de Parcelas</Label>
                    <Input
                      id="qtdParcelas"
                      type="number"
                      min="1"
                      value={qtdParcelas}
                      onChange={(e) => setQtdParcelas(parseInt(e.target.value, 10) || 0)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor da Parcela</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-mono text-sm">
                      {formatCurrency(valorParcela)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Cálculos */}
            {activeCalculation && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Cálculos
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Valor Tabela à Vista Icms Ajustado:</span>
                    <span>{formatCurrency(activeCalculation.valorTabelaAjustado)}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      Over Price
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          if (editingOverPrice) {
                            setEditingOverPrice(false);
                          } else {
                            setManualOverPrice(activeCalculation.overPrice);
                            setEditingOverPrice(true);
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </span>
                    {editingOverPrice ? (
                      <Input
                        type="number"
                        value={manualOverPrice ?? ''}
                        onChange={(e) => setManualOverPrice(parseFloat(e.target.value) || 0)}
                        className="w-32 h-7 text-right font-mono"
                        autoFocus
                        onBlur={() => setEditingOverPrice(false)}
                      />
                    ) : (
                      <span className={activeCalculation.overPrice < 0 ? 'text-destructive' : 'text-success'}>
                        {formatCurrency(activeCalculation.overPrice)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) Icms</span>
                    <span>-{formatCurrency(activeCalculation.deducaoIcms)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) Pis/Cofins</span>
                    <span>-{formatCurrency(activeCalculation.deducaoPisCofins)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) IR/CSLL</span>
                    <span>-{formatCurrency(activeCalculation.deducaoIrCsll)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Resultado Líquido</span>
                    <span className={activeCalculation.overLiquido < 0 ? 'text-destructive' : 'text-success'}>
                      {formatCurrency(activeCalculation.overLiquido)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Comissão à ser Paga */}
            {activeCalculation && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Comissão à ser Paga
                </h3>
                <div className="bg-primary/10 rounded-lg p-4 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Pedido</span>
                    <span>{formatCurrency(activeCalculation.comissaoPedido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Over</span>
                    <span className={activeCalculation.overLiquido < 0 ? 'text-destructive' : ''}>
                      {formatCurrency(activeCalculation.overLiquido)}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>R$</span>
                    <span className="text-primary">{formatCurrency(activeCalculation.comissaoTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
