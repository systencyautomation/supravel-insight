import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Loader2, Save, Info } from 'lucide-react';
import type { OrganizationSettings } from '@/hooks/useOrganizationSettings';

interface CommissionParametersFormProps {
  settings: OrganizationSettings;
  saving: boolean;
  onSave: (data: Partial<OrganizationSettings>) => Promise<boolean>;
}

export function CommissionParametersForm({ settings, saving, onSave }: CommissionParametersFormProps) {
  const [comissaoBase, setComissaoBase] = useState<'valor_tabela' | 'comissao_empresa'>('valor_tabela');
  const [comissaoOverPercent, setComissaoOverPercent] = useState('10');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setComissaoBase(settings.comissao_base || 'valor_tabela');
      setComissaoOverPercent(String(settings.comissao_over_percent ?? 10));
      setIsDirty(false);
    }
  }, [settings]);

  const handleComissaoBaseChange = (value: string) => {
    setComissaoBase(value as 'valor_tabela' | 'comissao_empresa');
    setIsDirty(true);
  };

  const handlePercentChange = (value: string) => {
    // Allow only numbers and decimal
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setComissaoOverPercent(cleaned);
    } else if (cleaned === '' || cleaned === '.') {
      setComissaoOverPercent(cleaned);
    }
    setIsDirty(true);
  };

  const handleSave = async () => {
    const success = await onSave({
      comissao_base: comissaoBase,
      comissao_over_percent: parseFloat(comissaoOverPercent) || 10,
    });
    if (success) setIsDirty(false);
  };

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Parametrização</CardTitle>
            <CardDescription>Configure as regras de comissão da empresa</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-sm font-medium">Comissão Base</Label>
          <p className="text-sm text-muted-foreground">
            Defina sobre qual valor a comissão do vendedor será calculada
          </p>
          
          <RadioGroup 
            value={comissaoBase} 
            onValueChange={handleComissaoBaseChange}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors">
              <RadioGroupItem value="valor_tabela" id="valor_tabela" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="valor_tabela" className="font-medium cursor-pointer">
                  Sobre o Valor de Tabela
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ex: Se valor tabela = R$ 20.000 e % = 8%, comissão = R$ 1.600
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors">
              <RadioGroupItem value="comissao_empresa" id="comissao_empresa" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="comissao_empresa" className="font-medium cursor-pointer">
                  Sobre a Comissão da Empresa
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ex: Se comissão empresa = R$ 2.500 e % = 8%, comissão vendedor = R$ 200
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-sm font-medium">Comissão do Over</Label>
          <p className="text-sm text-muted-foreground">
            Percentual do Over Líquido que o vendedor/representante recebe
          </p>
          
          <div className="flex items-center gap-3 max-w-xs">
            <Input
              type="text"
              value={comissaoOverPercent}
              onChange={(e) => handlePercentChange(e.target.value)}
              placeholder="10"
              className="h-11 rounded-xl text-right"
            />
            <span className="text-lg font-medium text-muted-foreground">%</span>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Quando o vendedor é atribuído a uma venda, ele recebe este percentual sobre o Over Líquido (após dedução de impostos).
            </p>
          </div>
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
            Salvar Parametrização
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
