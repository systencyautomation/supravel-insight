import { useEffect, useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useRepresentativeCompanies } from '@/hooks/useRepresentativeCompanies';
import { supabase } from '@/integrations/supabase/client';
import { SearchableCombobox, type ComboboxOption } from './SearchableCombobox';
import { AddRepresentativeInline } from './AddRepresentativeInline';

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface CommissionAssignmentData {
  internalSellerId: string | null;
  internalSellerPercent: number;
  representativeId: string | null;
  representativePercent: number;
  overSplitInternal: number;
  overSplitRepresentative: number;
}

interface CommissionAssignmentProps {
  organizationId: string | null;
  initialData?: Partial<CommissionAssignmentData>;
  onChange: (data: CommissionAssignmentData) => void;
}

export function CommissionAssignment({ 
  organizationId, 
  initialData,
  onChange 
}: CommissionAssignmentProps) {
  const { companies: representativeCompanies, loading: repsLoading, createCompany, refetch: refetchReps } = useRepresentativeCompanies(organizationId);
  const [sellers, setSellers] = useState<OrgMember[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);

  const [useInternalSeller, setUseInternalSeller] = useState(false);
  const [useRepresentative, setUseRepresentative] = useState(false);
  
  const [internalSellerId, setInternalSellerId] = useState<string | null>(null);
  const [internalSellerPercent, setInternalSellerPercent] = useState(0);
  
  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [representativePercent, setRepresentativePercent] = useState(0);

  const [showAddRepDialog, setShowAddRepDialog] = useState(false);

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

  // Initialize from props
  useEffect(() => {
    if (initialData) {
      if (initialData.internalSellerId) {
        setUseInternalSeller(true);
        setInternalSellerId(initialData.internalSellerId);
        setInternalSellerPercent(initialData.internalSellerPercent || 0);
      }
      if (initialData.representativeId) {
        setUseRepresentative(true);
        setRepresentativeId(initialData.representativeId);
        setRepresentativePercent(initialData.representativePercent || 0);
      }
    }
  }, [initialData]);

  // Notify parent of changes
  useEffect(() => {
    onChange({
      internalSellerId: useInternalSeller ? internalSellerId : null,
      internalSellerPercent: useInternalSeller ? internalSellerPercent : 0,
      representativeId: useRepresentative ? representativeId : null,
      representativePercent: useRepresentative ? representativePercent : 0,
      overSplitInternal: useInternalSeller ? 10 : 0,
      overSplitRepresentative: useRepresentative ? 10 : 0,
    });
  }, [useInternalSeller, internalSellerId, internalSellerPercent, useRepresentative, representativeId, representativePercent, onChange]);

  const activeReps = representativeCompanies.filter(r => r.active !== false);

  const sellerOptions: ComboboxOption[] = useMemo(() =>
    sellers.map(s => ({ value: s.id, label: s.full_name, subtitle: s.email })),
    [sellers]
  );

  const repOptions: ComboboxOption[] = useMemo(() =>
    activeReps.map(r => ({
      value: r.id,
      label: r.name,
      subtitle: r.position === 'indicador' ? 'Indicador' : 'Representante',
    })),
    [activeReps]
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Atribuição de Comissão
          </h3>
        </div>

        {/* Vendedor Interno */}
        <div className="space-y-3 p-3 rounded-lg border bg-card">
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
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selecionar</Label>
                <SearchableCombobox
                  options={sellerOptions}
                  value={internalSellerId}
                  onValueChange={setInternalSellerId}
                  placeholder="Buscar vendedor..."
                  searchPlaceholder="Buscar por nome..."
                  emptyMessage="Nenhum vendedor encontrado."
                  loading={loadingSellers}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">% s/ Tabela</Label>
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
          )}
        </div>

        {/* Representante */}
        <div className="space-y-3 p-3 rounded-lg border bg-card">
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
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selecionar</Label>
                <SearchableCombobox
                  options={repOptions}
                  value={representativeId}
                  onValueChange={setRepresentativeId}
                  placeholder="Buscar representante..."
                  searchPlaceholder="Buscar por nome..."
                  emptyMessage="Nenhum representante encontrado."
                  loading={repsLoading}
                  showAddButton
                  addButtonLabel="Cadastrar novo representante"
                  onAddClick={() => setShowAddRepDialog(true)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">% s/ Tabela</Label>
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
          )}
        </div>

        {/* Info sobre Over */}
        {(useInternalSeller || useRepresentative) && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Over:</strong> Cada participante recebe 10% do Over Líquido quando selecionado.
          </div>
        )}
      </div>

      <AddRepresentativeInline
        open={showAddRepDialog}
        onOpenChange={setShowAddRepDialog}
        onAdd={createCompany}
        onCreated={(rep) => {
          setRepresentativeId(rep.id);
          refetchReps();
        }}
      />
    </>
  );
}
