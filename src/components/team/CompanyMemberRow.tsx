import { Phone, Wrench, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CompanyMember } from '@/hooks/useCompanyMembers';

interface CompanyMemberRowProps {
  member: CompanyMember;
}

export function CompanyMemberRow({ member }: CompanyMemberRowProps) {
  const isResponsavel = member.role === 'responsavel';

  return (
    <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/30 rounded-md transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{member.name}</span>
          {isResponsavel && (
            <Badge variant="outline" className="text-xs">
              responsável
            </Badge>
          )}
          {member.is_technical && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Wrench className="h-3 w-3" />
              técnico
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {member.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {member.phone}
          </span>
        )}
      </div>
    </div>
  );
}
