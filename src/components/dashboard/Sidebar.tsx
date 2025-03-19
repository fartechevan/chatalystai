import {
  BarChart,
  BookText,
  Settings,
  Tool,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  Sidebar as SidebarBase,
  SidebarButton,
  SidebarButtonLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarLogo,
  SidebarNav,
  SidebarSection,
  SidebarUser,
  SidebarUserAvatar,
  SidebarUserEmail,
  SidebarUserName,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/AuthProvider";

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <SidebarBase>
      <SidebarHeader>
        <SidebarLogo>GeniusAI</SidebarLogo>
      </SidebarHeader>
      <SidebarSection>
        <SidebarUser>
          <SidebarUserAvatar src={user?.user_metadata?.avatar_url} />
          <SidebarUserName>{user?.user_metadata?.full_name}</SidebarUserName>
          <SidebarUserEmail>{user?.email}</SidebarUserEmail>
        </SidebarUser>
      </SidebarSection>
      
      <SidebarSection>
        <SidebarHeader>
          <SidebarLogo icon={<Tool className="w-4 h-4" />}>
            Tools
          </SidebarLogo>
        </SidebarHeader>
        <SidebarNav orientation="vertical">
          <SidebarButton component={Link} to="/knowledge">
            <BookText className="w-4 h-4" />
            <SidebarButtonLabel>Knowledge Base</SidebarButtonLabel>
          </SidebarButton>
          <SidebarButton component={Link} to="/stats">
            <BarChart className="w-4 h-4" />
            <SidebarButtonLabel>Stats</SidebarButtonLabel>
          </SidebarButton>
          <SidebarButton component={Link} to="/admin">
            <Settings className="w-4 h-4" />
            <SidebarButtonLabel>Admin</SidebarButtonLabel>
          </SidebarButton>
        </SidebarNav>
      </SidebarSection>

      <SidebarFooter>
        <SidebarSection>
          <SidebarNav orientation="vertical">
            <SidebarButton onClick={logout}>
              Log out
            </SidebarButton>
          </SidebarNav>
        </SidebarSection>
      </SidebarFooter>
    </SidebarBase>
  );
}
