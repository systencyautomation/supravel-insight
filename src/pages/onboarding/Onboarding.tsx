import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Building2, Lock, CheckCircle, AlertCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
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

type Step = 'form' | 'verification' | 'success';

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Verification state
  const [step, setStep] = useState<Step>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(600); // 10 minutes in seconds

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
      setLoading(false);
      return;
    }

    fetchInvitation(token);
  }, [token]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Expiration timer
  useEffect(() => {
    if (step === 'verification' && expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, expiresIn]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendVerificationCode = async () => {
    if (!invitation) return;

    try {
      const response = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: invitation.email,
          invitation_id: invitation.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar código');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Código Enviado',
        description: `Um código de verificação foi enviado para ${invitation.email}`,
      });

      setExpiresIn(600); // Reset expiration timer
      setResendCooldown(60); // 60 seconds cooldown
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const handleFormSubmit = async () => {
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
      const success = await sendVerificationCode();
      if (success) {
        setStep('verification');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!invitation || code.length !== 6) return;

    setVerifying(true);

    try {
      // Verify the code
      const response = await supabase.functions.invoke('verify-email-code', {
        body: {
          email: invitation.email,
          code,
          invitation_id: invitation.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao verificar código');
      }

      if (!response.data?.valid) {
        toast({
          title: 'Código Inválido',
          description: response.data?.error || 'O código inserido é inválido ou expirou.',
          variant: 'destructive'
        });
        setVerificationCode('');
        return;
      }

      // Code is valid, proceed with account creation
      await createAccount();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      setVerificationCode('');
    } finally {
      setVerifying(false);
    }
  };

  const createAccount = async () => {
    if (!invitation) return;

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

      // 3. Update invitation status using RPC (bypasses RLS)
      await supabase.rpc('accept_invitation', {
        p_invitation_id: invitation.id
      });

      setStep('success');
      toast({
        title: 'Cadastro Concluído',
        description: 'Sua conta foi criada com sucesso!',
      });

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await sendVerificationCode();
  };

  const handleBackToForm = () => {
    setStep('form');
    setVerificationCode('');
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

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h1 className="text-lg font-medium text-foreground mb-2">Cadastro Realizado!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sua conta foi criada com sucesso para <strong className="text-foreground">{invitation?.email}</strong>.
          </p>
          <Button onClick={() => navigate('/auth')} className="text-sm">
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-medium text-foreground">Verificar Email</h1>
              <p className="text-xs text-muted-foreground">Insira o código enviado para seu email</p>
            </div>
          </div>

          {/* Email info */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Código enviado para</p>
            <p className="text-sm font-mono text-foreground">{invitation?.email}</p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center mb-4">
            <InputOTP 
              maxLength={6} 
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                if (value.length === 6) {
                  handleVerifyCode(value);
                }
              }}
              disabled={verifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Expiration timer */}
          {expiresIn > 0 ? (
            <p className="text-xs text-center text-muted-foreground mb-4">
              Código expira em <span className="font-mono text-foreground">{formatTime(expiresIn)}</span>
            </p>
          ) : (
            <p className="text-xs text-center text-destructive mb-4">
              Código expirado. Solicite um novo código.
            </p>
          )}

          {/* Verifying state */}
          {verifying && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verificando...</span>
            </div>
          )}

          {/* Resend button */}
          <div className="flex justify-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              className="text-xs"
            >
              {resendCooldown > 0 ? (
                <>Reenviar código em {resendCooldown}s</>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>

          {/* Back button */}
          <Button
            variant="outline"
            onClick={handleBackToForm}
            className="w-full text-sm"
            disabled={verifying}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar e editar dados
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
          onClick={handleFormSubmit}
          disabled={submitting}
          className="w-full text-sm"
        >
          {submitting ? 'Enviando código...' : 'Continuar'}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Ao criar sua conta, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
}