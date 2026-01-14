import { useState, useEffect } from 'react';
import { useOrganizationSettings, OrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Plug, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export function Integrations() {
  const { settings, loading, saving, testing, updateSettings, testConnection } = useOrganizationSettings();
  
  const [formData, setFormData] = useState<OrganizationSettings>({
    imap_host: 'imap.hostgator.com.br',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    automation_active: false,
  });

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: keyof OrganizationSettings, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setConnectionStatus('idle');
  };

  const handleTestConnection = async () => {
    const success = await testConnection(formData);
    setConnectionStatus(success ? 'success' : 'error');
  };

  const handleSave = async () => {
    await updateSettings(formData);
  };

  const handleToggleAutomation = async (checked: boolean) => {
    handleInputChange('automation_active', checked);
    await updateSettings({ automation_active: checked });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <Card className="rounded-none border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-medium">Integrações</CardTitle>
                <CardDescription>Configure a automação de processamento de XMLs</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {formData.automation_active ? 'Ativo' : 'Inativo'}
              </span>
              <Switch
                checked={formData.automation_active}
                onCheckedChange={handleToggleAutomation}
                disabled={saving}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* IMAP Configuration */}
      <Card className="rounded-none border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-medium">Configuração de E-mail (IMAP)</CardTitle>
              <CardDescription>Credenciais para acesso à caixa de entrada</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Host and Port Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imap_host" className="text-sm font-medium">
                Host IMAP
              </Label>
              <Input
                id="imap_host"
                type="text"
                value={formData.imap_host}
                onChange={(e) => handleInputChange('imap_host', e.target.value)}
                placeholder="imap.hostgator.com.br"
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imap_port" className="text-sm font-medium">
                Porta
              </Label>
              <Input
                id="imap_port"
                type="number"
                value={formData.imap_port}
                onChange={(e) => handleInputChange('imap_port', parseInt(e.target.value) || 993)}
                placeholder="993"
                className="rounded-none"
              />
            </div>
          </div>

          {/* User */}
          <div className="space-y-2">
            <Label htmlFor="imap_user" className="text-sm font-medium">
              Usuário (E-mail)
            </Label>
            <Input
              id="imap_user"
              type="email"
              value={formData.imap_user}
              onChange={(e) => handleInputChange('imap_user', e.target.value)}
              placeholder="ia@suaempresa.com.br"
              className="rounded-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="imap_password" className="text-sm font-medium">
              Senha
            </Label>
            <Input
              id="imap_password"
              type="password"
              value={formData.imap_password}
              onChange={(e) => handleInputChange('imap_password', e.target.value)}
              placeholder="••••••••••••"
              className="rounded-none"
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !formData.imap_user || !formData.imap_password}
                className="rounded-none gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : connectionStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : connectionStatus === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Testar Conexão
              </Button>
              {connectionStatus === 'success' && (
                <span className="text-sm text-green-600">Conexão OK</span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-sm text-destructive">Falha na conexão</span>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-none gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card className="rounded-none border-border bg-muted/30">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Como Funciona</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              O sistema verifica e-mails com arquivos XML a cada 15 minutos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Extrai automaticamente: modelo, valor total e parcelas do documento fiscal
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Cruza com a tabela de Estoque para calcular o Over Price (desconto de 9,25% + 34% impostos)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Vendas processadas aparecem automaticamente no dashboard
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
