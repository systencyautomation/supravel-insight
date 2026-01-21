import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Permission, AVAILABLE_PERMISSIONS } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'manager' | 'seller' | 'representative';

const roleLabels: Record<AppRole, string> = {
  admin: 'Gerente',
  manager: 'Auxiliar',
  seller: 'Vendedor',
  representative: 'Representante',
};

// Default permissions for each role when no org-specific config exists
const defaultRolePermissions: Record<AppRole, Permission[]> = {
  admin: AVAILABLE_PERMISSIONS.map(p => p.key), // All permissions
  manager: [
    'view_dashboard',
    'view_sales',
    'approve_sales',
    'manage_inventory',
    'view_commissions',
    'view_all_commissions',
    'manage_team',
    'view_linked_representatives',
  ],
  seller: [
    'view_dashboard',
    'view_sales',
    'view_commissions',
    'view_linked_representatives',
  ],
  representative: [
    'view_commissions',
  ],
};

interface PermissionSelectorProps {
  organizationId: string;
  selectedRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  selectedPermissions: Permission[];
  onPermissionsChange: (permissions: Permission[]) => void;
  disabled?: boolean;
  hideAdminRole?: boolean;
}

export function PermissionSelector({
  organizationId,
  selectedRole,
  onRoleChange,
  selectedPermissions,
  onPermissionsChange,
  disabled = false,
  hideAdminRole = true,
}: PermissionSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [roleTemplates, setRoleTemplates] = useState<Record<AppRole, Permission[]>>(defaultRolePermissions);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Fetch organization's role permission templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('role, permission')
          .eq('organization_id', organizationId);

        if (error) throw error;

        if (data && data.length > 0) {
          const templates: Record<string, Permission[]> = {};
          data.forEach(row => {
            if (!templates[row.role]) {
              templates[row.role] = [];
            }
            templates[row.role].push(row.permission as Permission);
          });
          
          // Merge with defaults
          setRoleTemplates(prev => ({
            ...prev,
            ...templates,
          }));
        }
      } catch (error) {
        console.error('Error fetching role templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    }

    fetchTemplates();
  }, [organizationId]);

  // When role changes, apply the template permissions
  const handleRoleChange = (role: AppRole) => {
    onRoleChange(role);
    
    // Admin always has all permissions
    if (role === 'admin') {
      onPermissionsChange(AVAILABLE_PERMISSIONS.map(p => p.key));
      setShowAdvanced(false);
    } else {
      const templatePerms = roleTemplates[role] || defaultRolePermissions[role];
      onPermissionsChange(templatePerms);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (selectedRole === 'admin') return; // Can't modify admin permissions
    
    if (selectedPermissions.includes(permission)) {
      onPermissionsChange(selectedPermissions.filter(p => p !== permission));
    } else {
      onPermissionsChange([...selectedPermissions, permission]);
    }
  };

  const availableRoles: AppRole[] = hideAdminRole 
    ? ['manager', 'seller', 'representative'] 
    : ['admin', 'manager', 'seller', 'representative'];

  const isCustomized = selectedRole !== 'admin' && 
    JSON.stringify([...selectedPermissions].sort()) !== 
    JSON.stringify([...(roleTemplates[selectedRole] || [])].sort());

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cargo</Label>
        <Select 
          value={selectedRole} 
          onValueChange={(v) => handleRoleChange(v as AppRole)} 
          disabled={disabled || loadingTemplates}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map(role => (
              <SelectItem key={role} value={role}>
                {roleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permission preview */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {selectedRole === 'admin' ? 'Acesso total (todas as permissões)' : 'Permissões do cargo'}
          </p>
          {isCustomized && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Customizado
            </span>
          )}
        </div>
        
        {selectedRole !== 'admin' && (
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_PERMISSIONS.filter(p => selectedPermissions.includes(p.key)).map(perm => (
              <span
                key={perm.key}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md"
              >
                <Check className="h-3 w-3" />
                {perm.label}
              </span>
            ))}
            {selectedPermissions.length === 0 && (
              <span className="text-xs text-muted-foreground">Nenhuma permissão selecionada</span>
            )}
          </div>
        )}
      </div>

      {/* Advanced toggle */}
      {selectedRole !== 'admin' && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={disabled}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Avançado (customizar permissões)
          </Button>

          {showAdvanced && (
            <div className="mt-3 space-y-2 border rounded-lg p-3">
              {AVAILABLE_PERMISSIONS.map(perm => (
                <div
                  key={perm.key}
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-md transition-colors",
                    selectedPermissions.includes(perm.key) ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    id={`perm-${perm.key}`}
                    checked={selectedPermissions.includes(perm.key)}
                    onCheckedChange={() => togglePermission(perm.key)}
                    disabled={disabled}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`perm-${perm.key}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {perm.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
