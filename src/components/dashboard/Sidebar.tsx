
import {
  BarChart,
  BookText,
  Settings,
  Wrench,
  LogOut
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  Sidebar as SidebarBase,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export function Sidebar() {
  const { user, loading } = useAuth();

  return (
    <SidebarBase>
      <SidebarHeader>
        <div className="text-xl font-bold px-4 py-2">GeniusAI</div>
      </SidebarHeader>
      
      <SidebarContent>
        {user && (
          <SidebarGroup>
            <div className="px-4 py-2 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.user_metadata?.full_name || 'User'}</span>
                <span className="text-xs text-sidebar-foreground/70">{user?.email}</span>
              </div>
            </div>
          </SidebarGroup>
        )}
      
        <SidebarGroup>
          <div className="px-4 py-2 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            <span className="text-sm font-medium">Tools</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Knowledge Base">
                  <Link to="/knowledge">
                    <BookText className="w-4 h-4" />
                    <span>Knowledge Base</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Stats">
                  <Link to="/stats">
                    <BarChart className="w-4 h-4" />
                    <span>Stats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Admin">
                  <Link to="/admin">
                    <Settings className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => supabase.auth.signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarBase>
  );
}
