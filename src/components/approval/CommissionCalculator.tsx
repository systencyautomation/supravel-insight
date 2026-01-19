import { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { calculateApprovalCommission, formatCurrency, getIcmsRate, calcularValorReal, getTaxaJuros } from '@/lib/approvalCalculator';
import type { PendingSale } from '@/hooks/usePendingSales';
import type { FipeDocument } from '@/hooks/useFipeDocument';

export interface Installment {
  id: string;
  sale_id: string;
  installment_number: number;
  value: number;
  due_date: string | null;
  status: string | null;
}

interface CommissionCalculatorProps {
  sale: PendingSale | null;
  installments: Installment[];
  fipeDocument: FipeDocument | null;
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
  // Campos de Valor Presente
  valorReal: number;        // Valor com VP aplicado
  jurosEmbutidos: number;   // Diferença entre parcelado e VP
  taxaJuros: number;        // Taxa usada (2.2% ou 3.5%)
}

export function CommissionCalculator({ 
  sale, 
  installments,
  fipeDocument,
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
  const [valorParcelaReal, setValorParcelaReal] = useState(0);

  // Over Price editing
  const [editingOverPrice, setEditingOverPrice] = useState(false);
  const [manualOverPrice, setManualOverPrice] = useState<number | null>(null);

  // Search FIPE spreadsheet for product code (prioritize produto_modelo = código FIPE)
  const matchedFipeRow = useMemo(() => {
    // Priorizar produto_modelo (código FIPE real), depois produto_codigo
    const codigoParaBusca = sale?.produto_modelo || sale?.produto_codigo;
    if (!codigoParaBusca || !fipeDocument?.gridData) return null;
    
    const gridData = fipeDocument.gridData;
    if (!gridData || gridData.length < 4) return null;

    // Find header row (usually row 2 or 3)
    let headerRowIndex = -1;
    let codIndex = -1;
    
    for (let i = 0; i < Math.min(5, gridData.length); i++) {
      const row = gridData[i];
      if (!row) continue;
      
      const idx = row.findIndex(cell => {
        const value = String(cell?.value || '').toLowerCase();
        return value.includes('cód') && value.includes('interno');
      });
      
      if (idx >= 0) {
        headerRowIndex = i;
        codIndex = idx;
        break;
      }
    }
    
    if (headerRowIndex === -1 || codIndex === -1) return null;
    
    const headerRow = gridData[headerRowIndex];
    
    // Find value and commission column indices
    const valorIndex = headerRow?.findIndex(cell => {
      const value = String(cell?.value || '').toLowerCase();
      return value.includes('valor') && value.includes('12%');
    }) ?? -1;
    
    const comissaoIndex = headerRow?.findIndex(cell => {
      const value = String(cell?.value || '').toLowerCase();
      return value.includes('comiss');
    }) ?? -1;
    
    const productCode = String(codigoParaBusca).trim();
    
    // Extract prefix before space or hyphen for flexible matching
    // e.g. "CDD12J - N." -> "CDD12J"
    const prefixMatch = productCode.match(/^([A-Za-z0-9]+)/);
    const codePrefix = prefixMatch ? prefixMatch[1] : productCode;

    // Search for matching product code with multiple strategies
    let bestMatch: { rowIndex: number; valorTabela: number; comissao: number } | null = null;
    
    for (let i = headerRowIndex + 1; i < gridData.length; i++) {
      const row = gridData[i];
      if (!row) continue;
      
      const cellValue = String(row[codIndex]?.value || '').trim();
      if (!cellValue) continue;
      
      // Strategy 1: Exact match (highest priority)
      if (cellValue === productCode) {
        return {
          rowIndex: i,
          valorTabela: valorIndex >= 0 ? parseFloat(String(row[valorIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
          comissao: comissaoIndex >= 0 ? parseFloat(String(row[comissaoIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
        };
      }
      
      // Strategy 2: Table code matches the prefix (e.g. table has "CDD12J", we have "CDD12J - N.")
      if (cellValue === codePrefix && !bestMatch) {
        bestMatch = {
          rowIndex: i,
          valorTabela: valorIndex >= 0 ? parseFloat(String(row[valorIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
          comissao: comissaoIndex >= 0 ? parseFloat(String(row[comissaoIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
        };
      }
      
      // Strategy 3: Table code starts with our prefix
      if (!bestMatch && cellValue.toUpperCase().startsWith(codePrefix.toUpperCase())) {
        bestMatch = {
          rowIndex: i,
          valorTabela: valorIndex >= 0 ? parseFloat(String(row[valorIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
          comissao: comissaoIndex >= 0 ? parseFloat(String(row[comissaoIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
        };
      }
      
      // Strategy 4: Our code starts with the table code
      if (!bestMatch && productCode.toUpperCase().startsWith(cellValue.toUpperCase())) {
        bestMatch = {
          rowIndex: i,
          valorTabela: valorIndex >= 0 ? parseFloat(String(row[valorIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
          comissao: comissaoIndex >= 0 ? parseFloat(String(row[comissaoIndex]?.value || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
        };
      }
    }
    
    return bestMatch;
  }, [sale?.produto_modelo, sale?.produto_codigo, fipeDocument]);

  // Update from sale and installments
  useEffect(() => {
    if (sale) {
      setValorFaturado(sale.total_value || 0);
      setIcmsDestino((sale.percentual_icms || getIcmsRate(sale.uf_destiny || '') * 100));
      setIcmsTabela(getIcmsRate(sale.emitente_uf || 'SP') * 100);
      
      // Pre-fill from existing sale data if available
      if (sale.table_value) setValorTabela(sale.table_value);
      if (sale.percentual_comissao) setPercentualComissao(sale.percentual_comissao);
      setValorEntrada(sale.valor_entrada || 0);
    }
  }, [sale]);

  // Pre-fill from installments
  useEffect(() => {
    if (installments.length > 0) {
      // First installment is usually the down payment (entrada)
      const entrada = installments.find(i => i.installment_number === 1);
      const parcelas = installments.filter(i => i.installment_number > 1);
      
      if (parcelas.length > 0) {
        setTipoPagamento('parcelado_boleto');
        setValorEntrada(entrada?.value || 0);
        setQtdParcelas(parcelas.length);
        setValorParcelaReal(parcelas[0]?.value || 0);
      } else if (entrada && installments.length === 1) {
        // Single payment = à vista
        setTipoPagamento('a_vista');
        setValorEntrada(0);
        setQtdParcelas(0);
        setValorParcelaReal(0);
      }
    } else if (sale) {
      // Fallback to payment_method parsing
      setTipoPagamento(sale.payment_method || 'a_vista');
      const paymentMethod = sale.payment_method || '';
      const parcelasMatch = paymentMethod.match(/(\d+)/);
      if (parcelasMatch) {
        setQtdParcelas(parseInt(parcelasMatch[1], 10));
      } else {
        setQtdParcelas(0);
      }
    }
  }, [installments, sale]);

  // Pre-fill from FIPE spreadsheet match
  useEffect(() => {
    if (matchedFipeRow && !sale?.table_value) {
      if (matchedFipeRow.valorTabela > 0) {
        setValorTabela(matchedFipeRow.valorTabela);
      }
      if (matchedFipeRow.comissao > 0) {
        setPercentualComissao(matchedFipeRow.comissao);
      }
    }
  }, [matchedFipeRow, sale?.table_value]);

  // Calculate valor da parcela (use real value if available, otherwise calculate)
  const valorParcela = useMemo(() => {
    if (valorParcelaReal > 0) return valorParcelaReal;
    if (qtdParcelas <= 0) return 0;
    const valorRestante = valorFaturado - valorEntrada;
    return valorRestante / qtdParcelas;
  }, [valorFaturado, valorEntrada, qtdParcelas, valorParcelaReal]);

  // Calculate Valor Real (com VP para parcelados)
  const valorReal = useMemo(() => {
    return calcularValorReal(
      tipoPagamento as 'a_vista' | 'parcelado_boleto' | 'parcelado_cartao',
      valorFaturado,
      valorEntrada,
      valorParcela,
      qtdParcelas
    );
  }, [tipoPagamento, valorFaturado, valorEntrada, valorParcela, qtdParcelas]);

  // Calculate juros embutidos (diferença entre total parcelado e VP)
  const jurosEmbutidos = useMemo(() => {
    if (tipoPagamento === 'a_vista') {
      return { valor: 0, taxaMensal: 0, taxaLabel: '' };
    }
    
    const totalParcelado = valorEntrada + (qtdParcelas * valorParcela);
    const diferencaVP = totalParcelado - valorReal;
    const taxa = getTaxaJuros(tipoPagamento);
    
    return {
      valor: diferencaVP,
      taxaMensal: taxa * 100,
      taxaLabel: `${(taxa * 100).toFixed(1)}% a.m.`
    };
  }, [tipoPagamento, valorEntrada, qtdParcelas, valorParcela, valorReal]);

  // Calculate commission using Valor Real (with VP)
  const calculation = useMemo(() => {
    if (!valorReal) return null;

    return calculateApprovalCommission({
      valorNF: valorReal, // Usar Valor Real (com VP) como base
      valorTabela,
      percentualComissao,
      icmsOrigem: icmsTabela / 100,
      icmsDestino: icmsDestino / 100,
    });
  }, [valorReal, valorTabela, percentualComissao, icmsTabela, icmsDestino]);

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
    const percentualFinal = valorReal ? (comissaoTotal / valorReal) * 100 : 0;

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
  }, [calculation, manualOverPrice, icmsDestino, percentualComissao, valorTabela, valorReal]);

  const activeCalculation = finalCalculation || calculation;

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
        valorReal,
        jurosEmbutidos: jurosEmbutidos.valor,
        taxaJuros: getTaxaJuros(tipoPagamento),
      });
    }
  }, [activeCalculation, valorTabela, percentualComissao, icmsTabela, icmsDestino, tipoPagamento, valorEntrada, qtdParcelas, valorParcela, valorReal, jurosEmbutidos, onCalculationChange]);

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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Dados da Tabela
                </h3>
                {/* Feedback visual do match */}
                {sale?.produto_codigo && (
                  matchedFipeRow ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500">
                      <Check className="h-3.5 w-3.5" />
                      <span>Produto encontrado (linha {matchedFipeRow.rowIndex + 1})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Código não encontrado na tabela</span>
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valorTabela" className="text-xs">Valor Tabela à Vista</Label>
                  <CurrencyInput
                    id="valorTabela"
                    value={valorTabela}
                    onChange={setValorTabela}
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
                  <CurrencyInput
                    id="valorFaturado"
                    value={valorFaturado}
                    onChange={setValorFaturado}
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcelado_cartao" id="parcelado_cartao" />
                  <Label htmlFor="parcelado_cartao" className="text-sm font-normal">Parcelado Cartão</Label>
                </div>
              </RadioGroup>
              
              {tipoPagamento !== 'a_vista' && jurosEmbutidos.valor !== 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Juros: {formatCurrency(jurosEmbutidos.valor)} ({jurosEmbutidos.taxaLabel})
                </p>
              )}
              
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valorEntrada" className="text-xs">Entrada R$</Label>
                  <CurrencyInput
                    id="valorEntrada"
                    value={valorEntrada}
                    onChange={setValorEntrada}
                    className="font-mono h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qtdParcelas" className="text-xs">Número de Parcelas</Label>
                  <Input
                    id="qtdParcelas"
                    type="number"
                    min="0"
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
            </div>

            <Separator />

            {/* Resumo Financeiro */}
            {tipoPagamento !== 'a_vista' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Resumo Financeiro
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Valor Total Faturado (NF):</span>
                    <span>{formatCurrency(valorFaturado)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Parcelado (Entrada + Parcelas):</span>
                    <span>{formatCurrency(valorEntrada + qtdParcelas * valorParcela)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) Juros ({jurosEmbutidos.taxaLabel}):</span>
                    <span className="text-orange-600 dark:text-orange-400">- {formatCurrency(jurosEmbutidos.valor)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Valor Presente Real:</span>
                    <span className="text-primary">{formatCurrency(valorReal)}</span>
                  </div>
                </div>
              </div>
            )}

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
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{formatCurrency(activeCalculation.comissaoTotal)}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        ({activeCalculation.percentualFinal.toFixed(4)}%)
                      </span>
                    </div>
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
