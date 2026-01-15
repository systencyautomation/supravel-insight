import { User, Building2, Users, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface ProfileSidebarProps {
  showTeamSection: boolean;
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export const ProfileSidebar = ({ 
  showTeamSection, 
  activeSection, 
  onSectionClick 
}: ProfileSidebarProps) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'profile-section', title: 'Meu Perfil', icon: User },
    { id: 'org-section', title: 'Organização', icon: Building2 },
    ...(showTeamSection ? [{ id: 'team-section', title: 'Equipe', icon: Users }] : []),
  ];

  return (
    <Sidebar className="border-r border-border/50 bg-card/50 backdrop-blur-sm">
      <SidebarContent className="pt-6 px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionClick(item.id)}
                    isActive={activeSection === item.id}
                    className="cursor-pointer rounded-xl h-11 px-4 transition-all duration-200 hover:bg-accent/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto pb-6">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/')}
                  className="cursor-pointer rounded-xl h-11 px-4 transition-all duration-200 hover:bg-accent/80"
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Voltar ao Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
