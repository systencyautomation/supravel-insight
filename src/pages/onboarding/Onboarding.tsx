import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';

interface Invitation {
  id: string;
  email: string;
  organization_name: string | null;
  status: string;
  token: string;
}

const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
      setLoading(false);
      return;
    }

    fetchInvitation(token);
  }, [token]);

  const fetchInvitation = async (token: string) => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      setInvalidToken(true);
    } else if (data.status !== 'pendente') {
      setInvalidToken(true);
    } else {
      setInvitation(data);
      if (data.organization_name) {
        setCompanyName(data.organization_name);
      }
    }

    setLoading(false);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = async () => {
    if (!invitation) return;

    const validation = onboardingSchema.safeParse({
      companyName,
      cnpj,
      password,
      confirmPassword
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // 1. Create user account or sign in if already exists
      let userId: string;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { 
            full_name: companyName,
            cnpj: cnpj.replace(/\D/g, '')
          }
        }
      });

      // Helper to wait for session to be properly set
      const waitForSession = async (): Promise<void> => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) return;
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        throw new Error('Sessão não foi estabelecida. Tente novamente.');
      };

      // Handle "User already registered" error
      if (authError) {
        if (authError.message.includes('already registered') || 
            authError.status === 422) {
          // Try to sign in with the provided password
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password
          });
          
          if (signInError) {
            throw new Error('Este email já está cadastrado. Verifique sua senha ou use a opção de recuperar senha.');
          }
          
          if (!signInData.user) throw new Error('Falha na autenticação');
          userId = signInData.user.id;
          
          // Wait for session to be established
          await waitForSession();
        } else {
          throw authError;
        }
      } else {
        if (!authData.user) throw new Error('Falha ao criar usuário');
        userId = authData.user.id;
        
        // Wait for session to be established
        await waitForSession();
      }

      // 2. Create organization using Security Definer function
      // This bypasses RLS race condition issues
      const slug = companyName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      const { data: orgId, error: rpcError } = await supabase.rpc(
        'create_organization_for_user',
        {
          p_name: companyName,
          p_slug: slug + '-' + Date.now().toString(36)
        }
      );

      if (rpcError) throw rpcError;

      // 3. Update invitation status
      await supabase
        .from('invitations')
        .update({ status: 'aceito' })
        .eq('id', invitation.id);

      setSuccess(true);
      toast({
        title: 'Cadastro Concluído',
        description: 'Verifique seu email para confirmar a conta.',
      });

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">Verificando convite...</div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-medium text-foreground mb-2">Convite Inválido</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Este link de convite é inválido, expirou ou já foi utilizado.
          </p>
          <Button onClick={() => navigate('/auth')} variant="outline" className="text-sm">
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h1 className="text-lg font-medium text-foreground mb-2">Cadastro Realizado!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Um email de confirmação foi enviado para <strong className="text-foreground">{invitation?.email}</strong>.
            Verifique sua caixa de entrada para ativar sua conta.
          </p>
          <Button onClick={() => navigate('/auth')} className="text-sm">
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-medium text-foreground">Configurar Empresa</h1>
            <p className="text-xs text-muted-foreground">Complete seu cadastro para acessar o sistema</p>
          </div>
        </div>

        {/* Email (Read-only) */}
        <div className="space-y-1 mb-4">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <div className="bg-muted border border-border px-3 py-2">
            <p className="text-sm font-mono text-foreground">{invitation?.email}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            <Lock className="h-3 w-3 inline mr-1" />
            Este email foi definido no convite e não pode ser alterado
          </p>
        </div>

        {/* Company Name */}
        <div className="space-y-1 mb-4">
          <Label className="text-xs">Nome da Empresa</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Sua Empresa Ltda"
            className="text-sm"
          />
          {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
        </div>

        {/* CNPJ */}
        <div className="space-y-1 mb-4">
          <Label className="text-xs">CNPJ</Label>
          <Input
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="text-sm font-mono"
          />
          {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1 mb-4">
          <Label className="text-xs">Senha</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="text-sm"
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
          </p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1 mb-6">
          <Label className="text-xs">Confirmar Senha</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="text-sm"
          />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full text-sm"
        >
          {submitting ? 'Cadastrando...' : 'Criar Conta'}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Ao criar sua conta, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
}
