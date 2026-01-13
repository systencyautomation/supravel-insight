import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Building2, LogOut, ArrowLeft, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isSuperAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && user && !isSuperAdmin) {
      toast.error('Acesso não autorizado');
      navigate('/');
      return;
    }

    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar organizações');
    } else {
      setOrganizations(data || []);
    }
    setLoading(false);
  };

  const createOrganization = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('organizations')
      .insert({ name: newOrgName, slug: newOrgSlug.toLowerCase().replace(/\s/g, '-') });

    if (error) {
      if (error.message.includes('duplicate')) {
        toast.error('Slug já existe');
      } else {
        toast.error('Erro ao criar organização');
      }
    } else {
      toast.success('Organização criada');
      setDialogOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
      fetchOrganizations();
    }

    setCreating(false);
  };

  const toggleActive = async (org: Organization) => {
    const { error } = await supabase
      .from('organizations')
      .update({ active: !org.active })
      .eq('id', org.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Organização ${!org.active ? 'ativada' : 'desativada'}`);
      fetchOrganizations();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Admin Master
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Gerenciamento de Tenants
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Organizações</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {organizations.length} registradas
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="uppercase tracking-tight">
                  Criar Organização
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide">Nome</Label>
                  <Input
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Ex: Supravel Logística"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide">Slug (URL)</Label>
                  <Input
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value)}
                    placeholder="Ex: supravel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Será usado na URL: /org/{newOrgSlug || 'slug'}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={createOrganization}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar Organização'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wide font-semibold">
                  Nome
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold">
                  Slug
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold">
                  Criado em
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma organização cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={org.active}
                        onCheckedChange={() => toggleActive(org)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
