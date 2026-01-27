import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, Save } from 'lucide-react';
import type { OrganizationSettings } from '@/hooks/useOrganizationSettings';

interface CompanyDataFormProps {
  settings: OrganizationSettings;
  organizationName: string;
  saving: boolean;
  onSave: (data: Partial<OrganizationSettings>) => Promise<boolean>;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

// Máscaras de input
const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
};

export function CompanyDataForm({ settings, organizationName, saving, onSave }: CompanyDataFormProps) {
  const [formData, setFormData] = useState({
    cnpj: '',
    razao_social: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email_contato: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        cnpj: settings.cnpj || '',
        razao_social: settings.razao_social || '',
        endereco: settings.endereco || '',
        cidade: settings.cidade || '',
        estado: settings.estado || '',
        cep: settings.cep || '',
        telefone: settings.telefone || '',
        email_contato: settings.email_contato || '',
      });
      setIsDirty(false);
    }
  }, [settings]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    let formattedValue = value;
    
    if (field === 'cnpj') formattedValue = formatCNPJ(value);
    if (field === 'telefone') formattedValue = formatPhone(value);
    if (field === 'cep') formattedValue = formatCEP(value);
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const success = await onSave(formData);
    if (success) setIsDirty(false);
  };

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
            <CardDescription>Informações cadastrais da sua organização</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome Fantasia</Label>
            <Input 
              value={organizationName} 
              disabled 
              className="h-11 rounded-xl bg-muted/50" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Razão Social</Label>
            <Input 
              value={formData.razao_social}
              onChange={(e) => handleChange('razao_social', e.target.value)}
              placeholder="Razão social completa"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">CNPJ</Label>
            <Input 
              value={formData.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado</Label>
            <Select 
              value={formData.estado} 
              onValueChange={(value) => handleChange('estado', value)}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {BRAZILIAN_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Endereço</Label>
          <Input 
            value={formData.endereco}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Rua, número, bairro"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cidade</Label>
            <Input 
              value={formData.cidade}
              onChange={(e) => handleChange('cidade', e.target.value)}
              placeholder="Cidade"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">CEP</Label>
            <Input 
              value={formData.cep}
              onChange={(e) => handleChange('cep', e.target.value)}
              placeholder="00000-000"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Telefone</Label>
            <Input 
              value={formData.telefone}
              onChange={(e) => handleChange('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Email de Contato</Label>
          <Input 
            type="email"
            value={formData.email_contato}
            onChange={(e) => handleChange('email_contato', e.target.value)}
            placeholder="contato@empresa.com.br"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            disabled={saving || !isDirty}
            className="rounded-xl"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
