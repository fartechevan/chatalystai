import { Menu, ChevronLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Main", icon: Menu, path: "/dashboard" },
  { title: "Settings", icon: ChevronLeft, path: "/dashboard/settings" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { toggleSidebar, open } = useSidebar();

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
          <SidebarHeader>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </SidebarHeader>
          <div className="px-2">
            {menuItems.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.title}
              >
                <Link to={item.path}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
}