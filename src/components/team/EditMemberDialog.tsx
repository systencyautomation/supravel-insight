import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CompanyMember } from '@/hooks/useCompanyMembers';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CompanyMember;
  onSave: (data: { name: string; phone?: string; is_technical: boolean }) => Promise<boolean>;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onSave,
}: EditMemberDialogProps) {
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone || '');
  const [isTechnical, setIsTechnical] = useState(member.is_technical);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const success = await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        is_technical: isTechnical,
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Editar Funcionário</DialogTitle>
          <DialogDescription>
            Atualize os dados do funcionário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Nome</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do funcionário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-phone">Telefone</Label>
            <Input
              id="member-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="member-technical">É Técnico</Label>
            <Switch
              id="member-technical"
              checked={isTechnical}
              onCheckedChange={setIsTechnical}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
