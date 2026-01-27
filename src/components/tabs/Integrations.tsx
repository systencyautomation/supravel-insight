import { useState, useEffect } from 'react';
import { useOrganizationSettings, OrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Plug, CheckCircle2, AlertCircle, Info, X, Plus, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function Integrations() {
  const { settings, loading, saving, testing, updateSettings, testConnection } = useOrganizationSettings();
  
  const [formData, setFormData] = useState<Partial<OrganizationSettings>>({
    imap_host: 'imap.hostgator.com.br',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    automation_active: false,
    imap_allowed_emails: [],
  });

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase().trim());
  };

  const handleAddEmail = async () => {
    const email = newEmail.toLowerCase().trim();
    
    if (!isValidEmail(email)) {
      toast.error('Formato de email inválido');
      return;
    }

    if (formData.imap_allowed_emails.includes(email)) {
      toast.error('Este email já está na lista');
      return;
    }

    const updatedEmails = [...formData.imap_allowed_emails, email];
    setFormData(prev => ({ ...prev, imap_allowed_emails: updatedEmails }));
    
    const success = await updateSettings({ imap_allowed_emails: updatedEmails });
    if (success) {
      setNewEmail('');
    } else {
      // Reverter em caso de erro
      setFormData(prev => ({ ...prev, imap_allowed_emails: formData.imap_allowed_emails }));
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    const updatedEmails = formData.imap_allowed_emails.filter(e => e !== emailToRemove);
    setFormData(prev => ({ ...prev, imap_allowed_emails: updatedEmails }));
    
    const success = await updateSettings({ imap_allowed_emails: updatedEmails });
    if (!success) {
      // Reverter em caso de erro
      setFormData(prev => ({ ...prev, imap_allowed_emails: formData.imap_allowed_emails }));
    }
  };

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
    const testSettings: OrganizationSettings = {
      imap_host: formData.imap_host || 'imap.hostgator.com.br',
      imap_port: formData.imap_port || 993,
      imap_user: formData.imap_user || '',
      imap_password: formData.imap_password || '',
      automation_active: formData.automation_active || false,
      imap_allowed_emails: formData.imap_allowed_emails || [],
      cnpj: '',
      razao_social: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email_contato: '',
      comissao_base: 'valor_tabela',
      comissao_over_percent: 10,
    };
    const success = await testConnection(testSettings);
    setConnectionStatus(success ? 'success' : 'error');
  };

  const handleSave = async () => {
    await updateSettings(formData);
  };

  const isImapConfigured = (): boolean => {
    return (
      formData.imap_host.trim() !== '' &&
      formData.imap_user.trim() !== '' &&
      formData.imap_password.trim() !== '' &&
      formData.imap_port > 0
    );
  };

  const handleToggleAutomation = async (checked: boolean) => {
    if (checked && !isImapConfigured()) {
      toast.error('Configure as credenciais IMAP antes de ativar a automação');
      return;
    }
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
              {!isImapConfigured() && !formData.automation_active && (
                <span className="text-xs text-amber-600">
                  Preencha as configurações IMAP primeiro
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {formData.automation_active ? 'Ativo' : 'Inativo'}
              </span>
              <Switch
                checked={formData.automation_active}
                onCheckedChange={handleToggleAutomation}
                disabled={saving || (!formData.automation_active && !isImapConfigured())}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* IMAP Configuration */}
      <Card className="rounded-none border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base font-medium">Configuração de E-mail (IMAP)</CardTitle>
                <CardDescription>Credenciais para acesso à caixa de entrada</CardDescription>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
                title="Editar configurações"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
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
                disabled={!isEditing}
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
                disabled={!isEditing}
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
              disabled={!isEditing}
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
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <>
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
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setConnectionStatus('idle');
                      if (settings) {
                        setFormData(settings);
                      }
                    }}
                    className="rounded-none"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleSave();
                      setIsEditing(false);
                    }}
                    disabled={saving}
                    className="rounded-none gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Remetentes Permitidos */}
      <Card className="rounded-none border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-medium">Remetentes Permitidos</CardTitle>
              <CardDescription>
                Apenas emails destes remetentes serão processados pela automação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de emails */}
          {formData.imap_allowed_emails.length > 0 ? (
            <div className="space-y-2">
              {formData.imap_allowed_emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                    disabled={saving}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum remetente cadastrado. Todos os emails serão processados.
            </p>
          )}

          {/* Adicionar novo email */}
          <div className="flex gap-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="rounded-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <Button
              variant="outline"
              onClick={handleAddEmail}
              disabled={saving || !newEmail.trim()}
              className="rounded-none gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            Se a lista estiver vazia, todos os emails serão processados (respeitando o filtro de domínios).
          </p>
        </CardContent>
      </Card>
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
