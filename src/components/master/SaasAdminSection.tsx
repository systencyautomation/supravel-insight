import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

interface SaasAdmin {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const saasAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

export function SaasAdminSection() {
  const { toast } = useToast();
  const [saasAdmins, setSaasAdmins] = useState<SaasAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSaasAdmins();
  }, []);

  const fetchSaasAdmins = async () => {
    setLoading(true);
    try {
      // Get all users with saas_admin role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'saas_admin');

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) {
        setSaasAdmins([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      setSaasAdmins(profiles || []);
    } catch (error) {
      console.error('Error fetching SaaS admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setErrors({});
  };

  const handleCreate = async () => {
    const validation = saasAdminSchema.safeParse({ email, fullName, password });

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
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-saas-admin', {
        body: { email, password, fullName }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'SaaS Admin Criado',
        description: `${email} agora é um SaaS Admin`,
      });

      setDialogOpen(false);
      resetForm();
      fetchSaasAdmins();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (admin: SaasAdmin) => {
    if (!confirm(`Tem certeza que deseja remover ${admin.email} como SaaS Admin?`)) {
      return;
    }

    setDeletingId(admin.id);

    try {
      const { data, error } = await supabase.functions.invoke('delete-saas-admin', {
        body: { userId: admin.id }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'SaaS Admin Removido',
        description: `${admin.email} foi removido`,
      });

      fetchSaasAdmins();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
            Administradores SaaS
          </h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar SaaS Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo SaaS Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                SaaS Admins podem criar organizações, gerenciar convites e visualizar qualquer organização.
                Não podem deletar organizações nem adicionar outros SaaS Admins.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome Completo</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome do administrador"
                    className="text-sm"
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    className="text-sm"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-sm"
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="flex-1 text-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="flex-1 text-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar SaaS Admin'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide">Nome</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Adicionado em</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saasAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{admin.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(admin)}
                      disabled={deletingId === admin.id}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingId === admin.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {saasAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum SaaS Admin cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
