import { useState } from 'react';
import { Phone, Wrench, User, MoreVertical, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompanyMember } from '@/hooks/useCompanyMembers';
import { EditMemberDialog } from './EditMemberDialog';

interface CompanyMemberRowProps {
  member: CompanyMember;
  onUpdate?: (memberId: string, data: { name: string; phone?: string; is_technical: boolean }) => Promise<boolean>;
}

export function CompanyMemberRow({ member, onUpdate }: CompanyMemberRowProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleSave = async (data: { name: string; phone?: string; is_technical: boolean }) => {
    if (!onUpdate) return false;
    return onUpdate(member.id, data);
  };

  return (
    <>
      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/30 rounded-md transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-6 flex justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{member.name}</span>
            {member.is_technical && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Wrench className="h-3 w-3" />
                técnico
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {member.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {member.phone}
            </span>
          )}
          {onUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {onUpdate && (
        <EditMemberDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          member={member}
          onSave={handleSave}
        />
      )}
    </>
  );
}
