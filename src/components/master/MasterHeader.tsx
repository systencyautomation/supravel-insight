import { Shield, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MasterHeaderProps {
  userEmail: string | undefined;
  isMasterAdmin: boolean;
  impersonatedOrgName: string | null;
  onExitImpersonation: () => void;
  onSignOut: () => void;
}

export function MasterHeader({
  userEmail,
  isMasterAdmin,
  impersonatedOrgName,
  onExitImpersonation,
  onSignOut,
}: MasterHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-gradient-to-r from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              {isMasterAdmin ? (
                <Shield className="h-5 w-5 text-primary-foreground" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  {isMasterAdmin ? 'Master Control' : 'Admin Control'}
                </h1>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] uppercase tracking-wider ${
                    isMasterAdmin 
                      ? 'border-primary/30 text-primary' 
                      : 'border-warning/30 text-warning'
                  }`}
                >
                  {isMasterAdmin ? 'Master' : 'SaaS Admin'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {impersonatedOrgName && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExitImpersonation}
                className="text-xs border-warning/30 text-warning hover:bg-warning/10"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Sair de {impersonatedOrgName}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="text-xs text-muted-foreground"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
