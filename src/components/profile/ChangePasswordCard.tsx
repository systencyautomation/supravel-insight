import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = 'form' | 'otp' | 'success';

export function ChangePasswordCard() {
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('form');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 6;

  const handleRequestChange = async () => {
    if (!passwordValid) {
      toast({
        title: 'Senha inválida',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação de senha deve ser igual à nova senha.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Supabase sends a nonce/OTP to the user's email when reauthenticating
      const { error } = await supabase.auth.reauthenticate();
      
      if (error) throw error;

      toast({
        title: 'Código enviado',
        description: 'Verifique seu email para o código de confirmação.',
      });
      setStep('otp');
    } catch (error: any) {
      console.error('Error requesting password change:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o código de confirmação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndChange = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos recebido por email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Verify the nonce and update password
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: 'email_change',
        token: otpCode,
        email: (await supabase.auth.getUser()).data.user?.email || '',
      });

      // Even if verification fails, try updating with nonce
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        nonce: otpCode,
      });

      if (error) throw error;

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      setStep('success');
      
      // Reset after success
      setTimeout(() => {
        setStep('form');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;

      toast({
        title: 'Código reenviado',
        description: 'Um novo código foi enviado para seu email.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível reenviar o código.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('form');
    setOtpCode('');
  };

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <CardTitle className="text-lg">Alterar Senha</CardTitle>
            <CardDescription>Defina uma nova senha para sua conta</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'form' && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleRequestChange}
              disabled={loading || !passwordValid || !passwordsMatch}
              className="gap-2 rounded-xl"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Alterar senha
            </Button>
          </>
        )}

        {step === 'otp' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Digite o código de 6 dígitos enviado para seu email
              </p>
            </div>
            
            <div className="flex justify-center">
              <InputOTP
                value={otpCode}
                onChange={setOtpCode}
                maxLength={6}
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

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleVerifyAndChange}
                disabled={loading || otpCode.length !== 6}
                className="gap-2 rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar alteração
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 rounded-xl"
                >
                  Voltar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="flex-1 rounded-xl"
                >
                  Reenviar código
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="text-center">
              <p className="font-medium">Senha alterada com sucesso!</p>
              <p className="text-sm text-muted-foreground">Use sua nova senha no próximo login.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
