import { Home, Menu, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Main", icon: Home, path: "/dashboard" },
  { title: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <div className="flex items-center justify-between px-4 py-2">
              <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
              <SidebarTrigger />
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.title}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}