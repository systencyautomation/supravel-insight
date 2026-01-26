import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BadgeCheck, Building2, FileText, Percent, DollarSign, TrendingDown, Pencil, CreditCard } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SaleDetailSheetProps {
  sale: SaleWithCalculations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailSheet({ sale, open, onOpenChange }: SaleDetailSheetProps) {
  const navigate = useNavigate();
  const { isSuperAdmin, userRoles } = useAuth();

  if (!sale) return null;

  const overPrice = sale.overPriceBruto;
  const hasVerifiedEntry = sale.entradaVerificada;

  // Check if user can edit (admin/manager)
  const canEdit = isSuperAdmin || userRoles.some(role => role.role === 'admin' || role.role === 'manager');
  const isApprovedOrPaid = sale.status === 'aprovado' || sale.status === 'pago';

  // Use pre-calculated deductions
  const deductions = {
    icms: sale.deducaoIcms,
    pisCofins: sale.deducaoPisCofins,
    irCsll: sale.deducaoIrCsll,
    total: sale.deducaoIcms + sale.deducaoPisCofins + sale.deducaoIrCsll,
  };

  const handleGoToApproval = () => {
    onOpenChange(false);
    navigate(`/sales/${sale.id}/approval`);
  };

  const handleEditCalculations = () => {
    onOpenChange(false);
    navigate(`/aprovacao?saleId=${sale.id}&mode=edit`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Detalhes da Venda</SheetTitle>
            {sale.status === 'aprovado' || sale.status === 'pago' ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <BadgeCheck className="h-3 w-3 mr-1" />
                {sale.status === 'pago' ? 'Pago' : 'Aprovado'}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                Pendente
              </Badge>
            )}
          </div>
          <SheetDescription>
            NF-e {sale.nfe_number || 'N/A'} • {sale.emission_date 
              ? format(parseISO(sale.emission_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : 'Data não informada'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Client Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Cliente
            </div>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <p className="font-medium">{sale.client_name || 'Cliente não informado'}</p>
              {sale.client_cnpj && (
                <p className="text-sm text-muted-foreground font-mono">
                  CNPJ: {sale.client_cnpj}
                </p>
              )}
              {sale.uf_destiny && (
                <p className="text-sm text-muted-foreground">
                  UF Destino: {sale.uf_destiny}
                </p>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Produto
            </div>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="font-medium">
                {sale.produto_modelo || sale.produto_marca || 'Produto não especificado'}
              </p>
              {sale.produto_descricao && (
                <p className="text-sm text-muted-foreground">{sale.produto_descricao}</p>
              )}
              {sale.produto_codigo && (
                <p className="text-xs text-muted-foreground font-mono">
                  Código: {sale.produto_codigo}
                </p>
              )}
              {sale.produto_numero_serie && (
                <p className="text-xs text-muted-foreground font-mono">
                  Série: {sale.produto_numero_serie}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Resumo Financeiro
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Valor Nominal (NF)</span>
                <span className="font-semibold text-lg">{formatCurrency(sale.total_value || 0)}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Valor Tabela</span>
                <span className="font-mono">{formatCurrency(sale.table_value || 0)}</span>
              </div>
            </div>
          </div>

          {/* Installments Section */}
          {sale.qtdParcelas > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Parcelamento
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Entrada</span>
                      {hasVerifiedEntry && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono">{formatCurrency(sale.entradaCalculada)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelas</span>
                    <span className="font-mono">
                      {sale.qtdParcelas}x {formatCurrency(sale.somaParcelas / sale.qtdParcelas)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Parcelado</span>
                    <span className="font-mono">{formatCurrency(sale.somaParcelas)}</span>
                  </div>
                  
                  {sale.installments.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Detalhes das Parcelas</p>
                      <div className="space-y-1 text-sm">
                        {sale.installments.map((inst, idx) => (
                          <div key={inst.id} className="flex justify-between text-muted-foreground">
                            <span>Parcela {idx + 1}</span>
                            <div className="flex gap-4 items-center">
                              {inst.due_date && (
                                <span className="text-xs">
                                  {format(parseISO(inst.due_date), 'dd/MM/yyyy')}
                                </span>
                              )}
                              <span className="font-mono w-24 text-right">{formatCurrency(Number(inst.value))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Over Price Calculation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              Cálculo do Over Price
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span>Over Price Bruto</span>
                <span className={`font-semibold ${overPrice >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(overPrice)}
                </span>
              </div>

              <Separator className="my-2" />

              <p className="text-xs text-muted-foreground uppercase tracking-wide">Deduções</p>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>ICMS ({sale.percentual_icms || 12}%)</span>
                  <span className="text-destructive">-{formatCurrency(deductions.icms)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>PIS/COFINS (9,25%)</span>
                  <span className="text-destructive">-{formatCurrency(deductions.pisCofins)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IR/CSLL (34%)</span>
                  <span className="text-destructive">-{formatCurrency(deductions.irCsll)}</span>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between font-semibold">
                <span>Over Price Líquido</span>
                <span className="text-success">{formatCurrency(sale.overPriceLiquido)}</span>
              </div>
            </div>
          </div>

          {/* Commission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Percent className="h-4 w-4" />
              Comissão
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão Base ({sale.percentual_comissao || 0}%)</span>
                <span className="font-mono">{formatCurrency(sale.comissaoPedido)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Over Price Líquido</span>
                <span className="font-mono">{formatCurrency(sale.overPriceLiquido)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between text-lg font-bold">
                <div className="flex items-center gap-2">
                  <span>Comissão Total</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {sale.percentualComissaoCalculado.toFixed(2)}%
                  </Badge>
                </div>
                <span className="text-primary">{formatCurrency(sale.valorComissaoCalculado)}</span>
              </div>
            </div>
          </div>

          {/* Observations */}
          {sale.observacoes && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Observações</p>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{sale.observacoes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 space-y-2">
            {sale.status === 'pendente' && (
              <Button onClick={handleGoToApproval} className="w-full">
                Ir para Aprovação
              </Button>
            )}
            {isApprovedOrPaid && canEdit && (
              <Button onClick={handleEditCalculations} variant="outline" className="w-full gap-2">
                <Pencil className="h-4 w-4" />
                Editar Cálculos
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
