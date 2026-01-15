import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, CheckCircle, AlertCircle } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  guest_name: string | null;
  organization_id: string;
  role: string;
  status: string;
  expires_at: string;
}

interface Organization {
  id: string;
  name: string;
}

type Step = 'loading' | 'invalid' | 'form' | 'verify' | 'success';

const JoinOrganization = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep('invalid');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      // Find invitation by token
      const { data: invitationData, error: invitationError } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pendente')
        .maybeSingle();

      if (invitationError) throw invitationError;

      if (!invitationData) {
        setStep('invalid');
        return;
      }

      // Check if expired
      if (new Date(invitationData.expires_at) < new Date()) {
        setStep('invalid');
        return;
      }

      setInvitation(invitationData);
      setFullName(invitationData.guest_name || '');

      // Fetch organization name
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', invitationData.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgData) {
        setStep('invalid');
        return;
      }

      setOrganization(orgData);
      setStep('form');
    } catch (error) {
      console.error('Error validating token:', error);
      setStep('invalid');
    }
  };

  const handleSubmitForm = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe seu nome completo.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'Por favor, verifique se as senhas são iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (!invitation) return;

    // Send verification code
    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: invitation.email,
          invitation_id: invitation.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Código enviado!',
        description: `Enviamos um código de verificação para ${invitation.email}.`,
      });

      setStep('verify');
    } catch (error) {
      console.error('Error sending code:', error);
      toast({
        title: 'Erro ao enviar código',
        description: 'Não foi possível enviar o código de verificação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: 'Código incompleto',
        description: 'Por favor, digite o código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    if (!invitation) return;

    setVerifying(true);
    try {
      // Call the complete-member-registration edge function
      const { data, error } = await supabase.functions.invoke('complete-member-registration', {
        body: {
          email: invitation.email,
          password,
          fullName,
          invitation_id: invitation.id,
          code: otpCode,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Login the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInError) {
        console.error('Error signing in:', signInError);
        // Still show success but redirect to login
        toast({
          title: 'Conta criada!',
          description: 'Sua conta foi criada. Faça login para continuar.',
        });
        setStep('success');
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Sua conta foi criada e você já está logado.',
      });

      // Redirect to dashboard
      navigate('/');
    } catch (error: any) {
      console.error('Error completing registration:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível completar o cadastro.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!invitation) return;

    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: invitation.email,
          invitation_id: invitation.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Código reenviado!',
        description: 'Um novo código foi enviado para seu email.',
      });
    } catch (error) {
      console.error('Error resending code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reenviar o código.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      manager: 'Gerente',
      seller: 'Vendedor',
      representative: 'Representante',
    };
    return labels[role] || role;
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid token
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>
              Este convite não existe, já foi usado ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Conta Criada!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Você já pode acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>
            {step === 'form' ? 'Criar sua Conta' : 'Verificar Email'}
          </CardTitle>
          <CardDescription>
            {step === 'form' ? (
              <>
                Você foi convidado para fazer parte da equipe de{' '}
                <span className="font-medium text-foreground">{organization?.name}</span>
                {' '}como <span className="font-medium text-foreground">{getRoleLabel(invitation?.role || '')}</span>.
              </>
            ) : (
              <>
                Digite o código de 6 dígitos enviado para{' '}
                <span className="font-medium text-foreground">{invitation?.email}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'form' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  disabled={sendingCode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={sendingCode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  disabled={sendingCode}
                />
              </div>

              <Button
                onClick={handleSubmitForm}
                disabled={sendingCode}
                className="w-full gap-2"
              >
                {sendingCode && <Loader2 className="h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
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

              <Button
                onClick={handleVerifyCode}
                disabled={verifying || otpCode.length !== 6}
                className="w-full gap-2"
              >
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                {verifying ? 'Criando conta...' : 'Verificar e Criar Conta'}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResendCode}
                  disabled={sendingCode}
                  className="text-sm"
                >
                  {sendingCode ? 'Enviando...' : 'Reenviar código'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinOrganization;
