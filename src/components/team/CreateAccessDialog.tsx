import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Representative } from '@/hooks/useRepresentatives';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface CreateAccessDialogProps {
  representative: Representative | null;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAccessDialog({ 
  representative, 
  organizationId,
  open, 
  onOpenChange,
  onSuccess 
}: CreateAccessDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!representative || !representative.email) return;
    
    setLoading(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('create-member-direct', {
        body: {
          email: representative.email,
          password: data.password,
          fullName: representative.name,
          role: 'representative',
          organizationId,
          representativeId: representative.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Acesso criado',
        description: `${representative.name} agora pode acessar o sistema.`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating access:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o acesso.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasNoEmail = !representative?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Acesso ao Sistema</DialogTitle>
          <DialogDescription>
            Defina uma senha para que o representante possa acessar o sistema.
          </DialogDescription>
        </DialogHeader>

        {hasNoEmail ? (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este representante não possui email cadastrado. Edite as informações e adicione um email antes de criar o acesso.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{representative?.name}</strong> terá acesso ao sistema com permissões padrão de representante.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={representative?.email || ''} 
                      disabled 
                      className="bg-muted"
                    />
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado aqui.
                  </p>
                </FormItem>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha *</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Mínimo 6 caracteres" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha *</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Repita a senha" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Acesso
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {hasNoEmail && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
