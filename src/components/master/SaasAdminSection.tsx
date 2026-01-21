import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Trash2, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';

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

function SaasAdminSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

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
    <Card className="overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            Administradores SaaS
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {saasAdmins.length} cadastrado{saasAdmins.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-border/50">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Novo SaaS Admin
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground">
                  SaaS Admins podem criar organizações, gerenciar convites e visualizar qualquer organização.
                  Não podem deletar organizações nem adicionar outros SaaS Admins.
                </p>
              </div>
              
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
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <SaasAdminSkeleton />
        ) : saasAdmins.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">
              Nenhum SaaS Admin
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione administradores para ajudar a gerenciar o sistema
            </p>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar SaaS Admin
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Adicionado em</TableHead>
                <TableHead className="text-right text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saasAdmins.map((admin) => (
                <TableRow key={admin.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{admin.full_name || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {admin.email}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(admin)}
                      disabled={deletingId === admin.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
