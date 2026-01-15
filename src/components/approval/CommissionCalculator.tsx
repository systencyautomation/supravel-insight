import { useState, useEffect, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { calculateApprovalCommission, formatCurrency, formatPercent, getIcmsRate } from '@/lib/approvalCalculator';
import type { PendingSale } from '@/hooks/usePendingSales';
import type { InventoryItem } from './FipeTable';

interface CommissionCalculatorProps {
  sale: PendingSale | null;
  selectedInventoryItem: InventoryItem | null;
  onCalculationChange: (data: CalculationData) => void;
}

export interface CalculationData {
  valorTabela: number;
  percentualComissao: number;
  icmsDestino: number;
  tipoPagamento: string;
  observacoes: string;
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
  selectedInventoryItem,
  onCalculationChange 
}: CommissionCalculatorProps) {
  // Editable fields
  const [valorTabela, setValorTabela] = useState(0);
  const [percentualComissao, setPercentualComissao] = useState(0);
  const [icmsDestino, setIcmsDestino] = useState(0);
  const [tipoPagamento, setTipoPagamento] = useState('a_vista');
  const [observacoes, setObservacoes] = useState('');
  const [editingOverPrice, setEditingOverPrice] = useState(false);
  const [manualOverPrice, setManualOverPrice] = useState<number | null>(null);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [qtdParcelas, setQtdParcelas] = useState(0);

  // Update from inventory item
  useEffect(() => {
    if (selectedInventoryItem) {
      setValorTabela(selectedInventoryItem.base_price || 0);
      setPercentualComissao(selectedInventoryItem.base_commission_pct || 0);
    }
  }, [selectedInventoryItem]);

  // Update from sale
  useEffect(() => {
    if (sale) {
      setIcmsDestino(sale.percentual_icms || getIcmsRate(sale.uf_destiny || '') * 100);
      setTipoPagamento(sale.payment_method || 'a_vista');
      setObservacoes(sale.observacoes || '');
      if (sale.table_value) setValorTabela(sale.table_value);
      if (sale.percentual_comissao) setPercentualComissao(sale.percentual_comissao);
      setValorEntrada(sale.valor_entrada || 0);
      
      // Parse payment_method for parcelas (format: "boleto_Nx" or similar)
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
    if (!sale?.total_value) return null;

    const icmsOrigem = getIcmsRate(sale.emitente_uf || 'SP');
    
    return calculateApprovalCommission({
      valorNF: sale.total_value,
      valorTabela,
      percentualComissao,
      icmsOrigem,
      icmsDestino: icmsDestino / 100,
    });
  }, [sale, valorTabela, percentualComissao, icmsDestino]);

  // Use manual over price if set
  const effectiveOverPrice = manualOverPrice !== null ? manualOverPrice : (calculation?.overPrice || 0);

  // Recalculate with manual over price
  const finalCalculation = useMemo(() => {
    if (!calculation || manualOverPrice === null) return calculation;

    // Recalculate deductions based on manual over price
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
    const percentualFinal = sale?.total_value ? (comissaoTotal / sale.total_value) * 100 : 0;

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
  }, [calculation, manualOverPrice, icmsDestino, percentualComissao, valorTabela, sale]);

  const activeCalculation = finalCalculation || calculation;

  // Calculate valor da parcela
  const valorParcela = useMemo(() => {
    if (qtdParcelas <= 0) return 0;
    const valorRestante = (sale?.total_value || 0) - valorEntrada;
    return valorRestante / qtdParcelas;
  }, [sale?.total_value, valorEntrada, qtdParcelas]);

  // Notify parent of changes
  useEffect(() => {
    if (activeCalculation) {
      onCalculationChange({
        valorTabela,
        percentualComissao,
        icmsDestino,
        tipoPagamento,
        observacoes,
        overPrice: activeCalculation.overPrice,
        overPriceLiquido: activeCalculation.overLiquido,
        comissaoTotal: activeCalculation.comissaoTotal,
        percentualFinal: activeCalculation.percentualFinal,
        valorEntrada,
        qtdParcelas,
        valorParcela,
      });
    }
  }, [activeCalculation, valorTabela, percentualComissao, icmsDestino, tipoPagamento, observacoes, valorEntrada, qtdParcelas, valorParcela]);

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
          <div className="p-4 space-y-6">
            {/* Dados da NFe */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados da NFe (automático)
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Código:</span>{' '}
                    <span className="font-mono">{sale.produto_codigo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NFe:</span>{' '}
                    <span className="font-mono">{sale.nfe_number || '-'}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Produto:</span>{' '}
                  {sale.produto_descricao || sale.client_name || '-'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor NF:</span>{' '}
                    <span className="font-semibold text-primary">
                      {formatCurrency(sale.total_value || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UF Destino:</span>{' '}
                    {sale.uf_destiny || '-'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados editáveis */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados da Tabela FIPE
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorTabela">Valor Tabela</Label>
                  <Input
                    id="valorTabela"
                    type="number"
                    value={valorTabela}
                    onChange={(e) => setValorTabela(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentualComissao">% Comissão</Label>
                  <Input
                    id="percentualComissao"
                    type="number"
                    step="0.5"
                    value={percentualComissao}
                    onChange={(e) => setPercentualComissao(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icmsDestino">% ICMS Destino</Label>
                  <Input
                    id="icmsDestino"
                    type="number"
                    step="1"
                    value={icmsDestino}
                    onChange={(e) => setIcmsDestino(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tipo de Pagamento */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Tipo de Pagamento
              </h3>
              <RadioGroup value={tipoPagamento} onValueChange={setTipoPagamento}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a_vista" id="a_vista" />
                  <Label htmlFor="a_vista">À Vista</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcelado_boleto" id="parcelado_boleto" />
                  <Label htmlFor="parcelado_boleto">Parcelado Boleto (2.2% a.m.)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcelado_cartao" id="parcelado_cartao" />
                  <Label htmlFor="parcelado_cartao">Parcelado Cartão (3.5% a.m.)</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Dados de Parcelamento */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados de Parcelamento
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorEntrada">Valor da Entrada</Label>
                  <Input
                    id="valorEntrada"
                    type="number"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qtdParcelas">Qtd. Parcelas</Label>
                  <Input
                    id="qtdParcelas"
                    type="number"
                    min="0"
                    value={qtdParcelas}
                    onChange={(e) => setQtdParcelas(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
              {qtdParcelas > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between items-center font-mono text-sm">
                    <span className="text-muted-foreground">Valor de cada parcela:</span>
                    <span className="font-semibold text-primary">{formatCurrency(valorParcela)}</span>
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
                    <span>Valor Tabela Ajustado:</span>
                    <span>{formatCurrency(activeCalculation.valorTabelaAjustado)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      Over Price:
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
                    <span>(-) ICMS {icmsDestino}%:</span>
                    <span>-{formatCurrency(activeCalculation.deducaoIcms)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) PIS/COFINS 9,25%:</span>
                    <span>-{formatCurrency(activeCalculation.deducaoPisCofins)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) IR/CSLL 34%:</span>
                    <span>-{formatCurrency(activeCalculation.deducaoIrCsll)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Over Líquido:</span>
                    <span className={activeCalculation.overLiquido < 0 ? 'text-destructive' : 'text-success'}>
                      {formatCurrency(activeCalculation.overLiquido)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Comissão Final */}
            {activeCalculation && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Comissão Final
                </h3>
                <div className="bg-primary/10 rounded-lg p-4 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Pedido ({percentualComissao}% × {formatCurrency(valorTabela)}):</span>
                    <span>{formatCurrency(activeCalculation.comissaoPedido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Over Líquido:</span>
                    <span className={activeCalculation.overLiquido < 0 ? 'text-destructive' : ''}>
                      {formatCurrency(activeCalculation.overLiquido)}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL COMISSÃO:</span>
                    <span className="text-primary">{formatCurrency(activeCalculation.comissaoTotal)}</span>
                  </div>
                  <div className="text-center text-muted-foreground">
                    ({activeCalculation.percentualFinal.toFixed(2)}% do valor faturado)
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre esta venda..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
