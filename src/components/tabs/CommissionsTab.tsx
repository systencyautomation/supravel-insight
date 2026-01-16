import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InternalSellerCommissions } from './InternalSellerCommissions';
import { RepresentativeCommissions } from './RepresentativeCommissions';
import { Users, Briefcase } from 'lucide-react';
import { Sale } from '@/types/commission';

interface CommissionsTabProps {
  sales: Sale[];
}

export function CommissionsTab({ sales }: CommissionsTabProps) {
  return (
    <Tabs defaultValue="vendedor" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="vendedor" className="gap-2">
          <Users className="h-4 w-4" />
          Vendedor
        </TabsTrigger>
        <TabsTrigger value="representante" className="gap-2">
          <Briefcase className="h-4 w-4" />
          Representante
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vendedor">
        <InternalSellerCommissions sales={sales} />
      </TabsContent>

      <TabsContent value="representante">
        <RepresentativeCommissions sales={sales} />
      </TabsContent>
    </Tabs>
  );
}
