import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreateCompanyData, CompanyType, RepresentativePosition } from '@/hooks/useRepresentativeCompanies';
import { CreateMemberData } from '@/hooks/useCompanyMembers';

const formSchema = z.object({
  company_type: z.enum(['mei', 'empresa'] as const),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional(),
  sede: z.string().optional(),
  position: z.enum(['indicador', 'representante'] as const),
  is_technical: z.boolean().default(false),
  // Responsável fields
  responsavel_name: z.string().min(2, 'Nome do responsável é obrigatório'),
  responsavel_phone: z.string().min(8, 'Telefone do responsável é obrigatório'),
  responsavel_email: z.string().email('Email inválido').optional().or(z.literal('')),
  responsavel_is_technical: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface AddCompanyDialogProps {
  onAddCompany: (companyData: CreateCompanyData) => Promise<{ id: string } | null>;
  onAddMember: (companyId: string, memberData: CreateMemberData) => Promise<unknown>;
}

export function AddCompanyDialog({ onAddCompany, onAddMember }: AddCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_type: 'empresa',
      name: '',
      cnpj: '',
      sede: '',
      position: 'representante',
      is_technical: false,
      responsavel_name: '',
      responsavel_phone: '',
      responsavel_email: '',
      responsavel_is_technical: false,
    },
  });

  const companyType = form.watch('company_type');
  const isMei = companyType === 'mei';

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    // Para MEI, o nome do responsável é o mesmo da empresa
    const companyName = isMei ? data.responsavel_name : data.name;
    
    // Criar empresa
    const company = await onAddCompany({
      name: companyName,
      cnpj: data.cnpj || undefined,
      company_type: data.company_type as CompanyType,
      sede: data.sede || undefined,
      position: data.position as RepresentativePosition,
      is_technical: data.is_technical,
    });

    if (company) {
      // Criar responsável
      await onAddMember(company.id, {
        name: data.responsavel_name,
        phone: data.responsavel_phone || undefined,
        email: data.responsavel_email || undefined,
        role: 'responsavel',
        is_technical: data.responsavel_is_technical,
      });

      form.reset();
      setOpen(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Empresa</DialogTitle>
          <DialogDescription>
            Cadastre uma empresa externa. O responsável é obrigatório.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de empresa */}
            <FormField
              control={form.control}
              name="company_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Empresa *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mei" id="mei" />
                        <Label htmlFor="mei" className="cursor-pointer">MEI - Pessoa única</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="empresa" id="empresa" />
                        <Label htmlFor="empresa" className="cursor-pointer">Empresa - Com funcionários</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome da empresa (apenas se não for MEI) */}
            {!isMei && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sede"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede/Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a posição" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="representante">Representante</SelectItem>
                      <SelectItem value="indicador">Indicador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_technical"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    Empresa presta serviços técnicos
                  </FormLabel>
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            {/* Responsável */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Responsável</h3>
              
              <FormField
                control={form.control}
                name="responsavel_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavel_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavel_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavel_is_technical"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">
                      É técnico
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
