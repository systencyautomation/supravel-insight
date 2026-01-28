import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/approvalCalculator';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { supabase } from '@/integrations/supabase/client';
import type { PendingSale } from '@/hooks/usePendingSales';

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface ConfirmedCalculationData {
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
  valorReal: number;
  jurosEmbutidos: number;
  taxaJuros: number;
}

export interface SellerAssignmentResult {
  internalSellerId: string | null;
  internalSellerPercent: number;
  representativeId: string | null;
  representativePercent: number;
  comissaoInternalSeller: number;
  comissaoRepresentative: number;
  comissaoTotalAtribuida: number;
}

interface SellerAssignmentProps {
  sale: PendingSale;
  confirmedData: ConfirmedCalculationData;
  organizationId: string | null;
  onApprove: (assignmentData: SellerAssignmentResult) => void;
  onReject: (motivo: string) => void;
  onBack: () => void;
}

export function SellerAssignment({ 
  sale,
  confirmedData,
  organizationId,
  onApprove,
  onReject,
  onBack,
}: SellerAssignmentProps) {
  const { representatives, loading: repsLoading } = useRepresentatives(organizationId);
  const { settings: orgSettings } = useOrganizationSettings();
  const [sellers, setSellers] = useState<OrgMember[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);

  // Selection state
  const [useInternalSeller, setUseInternalSeller] = useState(false);
  const [useRepresentative, setUseRepresentative] = useState(false);
  
  const [internalSellerId, setInternalSellerId] = useState<string | null>(null);
  const [internalSellerPercent, setInternalSellerPercent] = useState(0);
  
  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [representativePercent, setRepresentativePercent] = useState(0);

  // Rejection state
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch organization members (sellers)
  useEffect(() => {
    const fetchSellers = async () => {
      if (!organizationId) {
        setLoadingSellers(false);
        return;
      }

      try {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('organization_id', organizationId)
          .in('role', ['seller', 'manager', 'admin']);

        if (rolesError) throw rolesError;

        if (roles && roles.length > 0) {
          const userIds = roles.map(r => r.user_id);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          const members: OrgMember[] = (profiles || []).map(p => {
            const role = roles.find(r => r.user_id === p.id);
            return {
              id: p.id,
              user_id: p.id,
              full_name: p.full_name || p.email || 'Sem nome',
              email: p.email || '',
              role: role?.role || 'seller',
            };
          });

          setSellers(members);
        }
      } catch (error) {
        console.error('Error fetching sellers:', error);
      } finally {
        setLoadingSellers(false);
      }
    };

    fetchSellers();
  }, [organizationId]);

  // Calculate commissions based on assignment
  const commissionBreakdown = useMemo(() => {
    const overLiquido = confirmedData.overPriceLiquido;
    const valorTabela = confirmedData.valorTabela;
    
    // Calcular comissão da empresa independentemente (valor tabela × percentual da empresa)
    const percentualEmpresa = confirmedData.percentualComissao || 0;
    const comissaoEmpresa = valorTabela * (percentualEmpresa / 100);
    
    // Determinar base de cálculo conforme parametrização
    const comissaoBase = orgSettings?.comissao_base || 'valor_tabela';
    const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
    const baseLabel = comissaoBase === 'valor_tabela' ? 'Tabela' : 'Comissão';
    
    // Debug log para verificar parametrização
    console.log('[SellerAssignment] Parametrização:', {
      comissao_base: orgSettings?.comissao_base,
      comissao_over_percent: orgSettings?.comissao_over_percent,
      baseCalculo,
      baseLabel,
      valorTabela,
      comissaoEmpresa,
    });
    
    // Comissão sobre a base escolhida (percentual customizado pelo aprovador)
    const comissaoBaseInternal = useInternalSeller ? (internalSellerPercent / 100) * baseCalculo : 0;
    const comissaoBaseRep = useRepresentative ? (representativePercent / 100) * baseCalculo : 0;
    
    // Over: usa percentual configurado na organização (default 10%)
    const overPercent = (orgSettings?.comissao_over_percent ?? 10) / 100;
    const overInternal = useInternalSeller && internalSellerId ? overLiquido * overPercent : 0;
    const overRep = useRepresentative && representativeId ? overLiquido * overPercent : 0;
    
    // Total por participante
    const comissaoInternalSeller = comissaoBaseInternal + Math.max(0, overInternal);
    const comissaoRepresentative = comissaoBaseRep + Math.max(0, overRep);
    
    // Total geral
    const comissaoTotalAtribuida = comissaoInternalSeller + comissaoRepresentative;
    
    return {
      comissaoBase,
      baseCalculo,
      baseLabel,
      comissaoBaseInternal,
      comissaoBaseRep,
      overInternal,
      overRep,
      overPercent: (orgSettings?.comissao_over_percent ?? 10),
      comissaoInternalSeller,
      comissaoRepresentative,
      comissaoTotalAtribuida,
    };
  }, [confirmedData, useInternalSeller, useRepresentative, internalSellerId, internalSellerPercent, representativeId, representativePercent, orgSettings?.comissao_over_percent, orgSettings?.comissao_base]);

  const handleApprove = () => {
    onApprove({
      internalSellerId: useInternalSeller ? internalSellerId : null,
      internalSellerPercent: useInternalSeller ? internalSellerPercent : 0,
      representativeId: useRepresentative ? representativeId : null,
      representativePercent: useRepresentative ? representativePercent : 0,
      comissaoInternalSeller: commissionBreakdown.comissaoInternalSeller,
      comissaoRepresentative: commissionBreakdown.comissaoRepresentative,
      comissaoTotalAtribuida: commissionBreakdown.comissaoTotalAtribuida,
    });
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason.trim());
    }
  };

  const activeReps = representatives.filter(r => r.active !== false);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Atribuição de Vendedor
          </CardTitle>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Etapa 2 de 2
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-5">
            {/* Resumo dos Valores Confirmados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Valores Confirmados
                </h3>
                <Button variant="ghost" size="sm" onClick={onBack} className="h-7 text-xs">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Voltar aos Cálculos
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-4 font-mono text-sm">
                <div>
                  <span className="text-xs text-muted-foreground font-sans">Valor Tabela</span>
                  <p className="font-semibold">{formatCurrency(confirmedData.valorTabela)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-sans">Over Price Líquido</span>
                  <p className={`font-semibold ${confirmedData.overPriceLiquido < 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(confirmedData.overPriceLiquido)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-sans">Comissão Empresa</span>
                  <p className="font-semibold text-primary">{formatCurrency(confirmedData.comissaoTotal)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-sans">Percentual Final</span>
                  <p className="font-semibold">{confirmedData.percentualFinal.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vendedor Interno */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="useInternalSeller" 
                  checked={useInternalSeller}
                  onCheckedChange={(checked) => setUseInternalSeller(!!checked)}
                />
                <Label htmlFor="useInternalSeller" className="text-sm font-medium">
                  Vendedor Interno
                </Label>
              </div>
              
              {useInternalSeller && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Selecionar</Label>
                      <Select 
                        value={internalSellerId || ''} 
                        onValueChange={setInternalSellerId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingSellers ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : sellers.length === 0 ? (
                            <SelectItem value="empty" disabled>Nenhum vendedor</SelectItem>
                          ) : (
                            sellers.map(seller => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.full_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">% sobre {commissionBreakdown.baseLabel}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={internalSellerPercent}
                        onChange={(e) => setInternalSellerPercent(parseFloat(e.target.value) || 0)}
                        className="h-9"
                        placeholder="Ex: 5"
                      />
                    </div>
                  </div>
                  
                  {/* Preview da comissão */}
                  {internalSellerId && (
                    <div className="bg-primary/5 rounded p-3 space-y-1 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{commissionBreakdown.baseLabel} ({internalSellerPercent}%)</span>
                        <span>{formatCurrency(commissionBreakdown.comissaoBaseInternal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Over ({commissionBreakdown.overPercent}%)</span>
                        <span>{formatCurrency(Math.max(0, commissionBreakdown.overInternal))}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold text-primary">
                        <span>Total</span>
                        <span>{formatCurrency(commissionBreakdown.comissaoInternalSeller)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Representante */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="useRepresentative" 
                  checked={useRepresentative}
                  onCheckedChange={(checked) => setUseRepresentative(!!checked)}
                />
                <Label htmlFor="useRepresentative" className="text-sm font-medium">
                  Representante
                </Label>
              </div>
              
              {useRepresentative && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Selecionar</Label>
                      <Select 
                        value={representativeId || ''} 
                        onValueChange={setRepresentativeId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {repsLoading ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : activeReps.length === 0 ? (
                            <SelectItem value="empty" disabled>Nenhum representante</SelectItem>
                          ) : (
                            activeReps.map(rep => (
                              <SelectItem key={rep.id} value={rep.id}>
                                {rep.name} {rep.company ? `(${rep.company})` : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">% sobre {commissionBreakdown.baseLabel}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={representativePercent}
                        onChange={(e) => setRepresentativePercent(parseFloat(e.target.value) || 0)}
                        className="h-9"
                        placeholder="Ex: 3"
                      />
                    </div>
                  </div>
                  
                  {/* Preview da comissão */}
                  {representativeId && (
                    <div className="bg-primary/5 rounded p-3 space-y-1 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{commissionBreakdown.baseLabel} ({representativePercent}%)</span>
                        <span>{formatCurrency(commissionBreakdown.comissaoBaseRep)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Over ({commissionBreakdown.overPercent}%)</span>
                        <span>{formatCurrency(Math.max(0, commissionBreakdown.overRep))}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold text-primary">
                        <span>Total</span>
                        <span>{formatCurrency(commissionBreakdown.comissaoRepresentative)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Total a Pagar */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total a Pagar
              </h3>
              <div className="bg-primary/10 rounded-lg p-4 space-y-2 font-mono text-sm">
                {(useInternalSeller && internalSellerId) && (
                  <div className="flex justify-between">
                    <span>Vendedor Interno</span>
                    <span>{formatCurrency(commissionBreakdown.comissaoInternalSeller)}</span>
                  </div>
                )}
                {(useRepresentative && representativeId) && (
                  <div className="flex justify-between">
                    <span>Representante</span>
                    <span>{formatCurrency(commissionBreakdown.comissaoRepresentative)}</span>
                  </div>
                )}
                {(!useInternalSeller || !internalSellerId) && (!useRepresentative || !representativeId) && (
                  <div className="text-center text-muted-foreground py-2">
                    Nenhum vendedor atribuído
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span className="text-primary">
                    {formatCurrency(commissionBreakdown.comissaoTotalAtribuida)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection input */}
            {showRejectInput && (
              <div className="space-y-2 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                <Label className="text-sm font-medium">Motivo da Rejeição</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Informe o motivo..."
                  className="h-9"
                  autoFocus
                />
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleReject}
                    disabled={!rejectReason.trim()}
                  >
                    Confirmar Rejeição
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Actions Footer */}
      {!showRejectInput && (
        <div className="p-4 border-t bg-card flex justify-between gap-3">
          <Button variant="outline" onClick={() => setShowRejectInput(true)}>
            Rejeitar
          </Button>
          <Button onClick={handleApprove}>
            Aprovar Venda
          </Button>
        </div>
      )}
    </Card>
  );
}
