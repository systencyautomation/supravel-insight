import { User, Building2, Users, ArrowLeft } from 'lucide-react';
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
    <Sidebar className="border-r border-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionClick(item.id)}
                    isActive={activeSection === item.id}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/')}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar ao Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
