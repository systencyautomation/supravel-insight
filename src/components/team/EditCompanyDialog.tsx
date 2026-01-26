import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RepresentativeCompany, RepresentativePosition } from '@/hooks/useRepresentativeCompanies';
import { CompanyMember } from '@/hooks/useCompanyMembers';

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: RepresentativeCompany;
  responsavel: CompanyMember | undefined;
  onSave: (
    companyData: {
      name: string;
      cnpj?: string;
      sede?: string;
      position: RepresentativePosition;
      is_technical: boolean;
    },
    responsavelData?: {
      name: string;
      phone?: string;
      email?: string;
      is_technical: boolean;
    }
  ) => Promise<boolean>;
}

export function EditCompanyDialog({
  open,
  onOpenChange,
  company,
  responsavel,
  onSave,
}: EditCompanyDialogProps) {
  const [companyName, setCompanyName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj || '');
  const [sede, setSede] = useState(company.sede || '');
  const [position, setPosition] = useState<RepresentativePosition>(company.position);
  const [companyTechnical, setCompanyTechnical] = useState(company.is_technical);

  const [responsavelName, setResponsavelName] = useState(responsavel?.name || '');
  const [responsavelPhone, setResponsavelPhone] = useState(responsavel?.phone || '');
  const [responsavelEmail, setResponsavelEmail] = useState(responsavel?.email || '');
  const [responsavelTechnical, setResponsavelTechnical] = useState(responsavel?.is_technical || false);

  const [saving, setSaving] = useState(false);

  const isMei = company.company_type === 'mei';

  const handleSave = async () => {
    if (!companyName.trim()) return;
    if (responsavel && !responsavelName.trim()) return;

    setSaving(true);
    try {
      const success = await onSave(
        {
          name: isMei ? responsavelName.trim() : companyName.trim(),
          cnpj: cnpj.trim() || undefined,
          sede: sede.trim() || undefined,
          position,
          is_technical: companyTechnical,
        },
        responsavel
          ? {
              name: responsavelName.trim(),
              phone: responsavelPhone.trim() || undefined,
              email: responsavelEmail.trim() || undefined,
              is_technical: responsavelTechnical,
            }
          : undefined
      );

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar {isMei ? 'MEI' : 'Empresa'}</DialogTitle>
          <DialogDescription>
            Atualize os dados {isMei ? 'do MEI' : 'da empresa'} e do responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dados da Empresa */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Dados {isMei ? 'do MEI' : 'da Empresa'}
            </h4>

            {!isMei && (
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sede">Cidade/Sede</Label>
                <Input
                  id="sede"
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as RepresentativePosition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicador">Indicador</SelectItem>
                    <SelectItem value="representante">Representante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="company-technical">Empresa Técnica</Label>
                <Switch
                  id="company-technical"
                  checked={companyTechnical}
                  onCheckedChange={setCompanyTechnical}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados do Responsável */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Responsável</h4>

            <div className="space-y-2">
              <Label htmlFor="responsavel-name">Nome</Label>
              <Input
                id="responsavel-name"
                value={responsavelName}
                onChange={(e) => setResponsavelName(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel-phone">Telefone</Label>
                <Input
                  id="responsavel-phone"
                  value={responsavelPhone}
                  onChange={(e) => setResponsavelPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel-email">Email (opcional)</Label>
                <Input
                  id="responsavel-email"
                  type="email"
                  value={responsavelEmail}
                  onChange={(e) => setResponsavelEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="responsavel-technical">Responsável é Técnico</Label>
              <Switch
                id="responsavel-technical"
                checked={responsavelTechnical}
                onCheckedChange={setResponsavelTechnical}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
