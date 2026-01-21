import { Building2, CheckCircle, Mail, XCircle } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';

interface Organization {
  id: string;
  active: boolean;
}

interface Invitation {
  id: string;
  status: string | null;
}

interface MasterKPICardsProps {
  organizations: Organization[];
  invitations: Invitation[];
}

export function MasterKPICards({ organizations, invitations }: MasterKPICardsProps) {
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.active).length;
  const inactiveOrgs = organizations.filter(o => !o.active).length;
  const pendingInvites = invitations.filter(i => i.status === 'pendente').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Organizações"
        value={totalOrgs}
        format="number"
        icon={Building2}
        variant="primary"
        subtitle="Registradas no sistema"
        delay={0}
      />
      <KPICard
        title="Organizações Ativas"
        value={activeOrgs}
        format="number"
        icon={CheckCircle}
        variant="success"
        subtitle={`${totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0}% do total`}
        delay={100}
      />
      <KPICard
        title="Organizações Inativas"
        value={inactiveOrgs}
        format="number"
        icon={XCircle}
        variant={inactiveOrgs > 0 ? 'warning' : 'default'}
        subtitle="Desativadas"
        delay={200}
      />
      <KPICard
        title="Convites Pendentes"
        value={pendingInvites}
        format="number"
        icon={Mail}
        variant={pendingInvites > 0 ? 'warning' : 'default'}
        subtitle="Aguardando aceite"
        delay={300}
      />
    </div>
  );
}
