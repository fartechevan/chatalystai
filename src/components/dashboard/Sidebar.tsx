
import { 
  Home, 
  Menu, 
  Settings, 
  MessageSquare, 
  List, 
  Calendar, 
  Target,
  Mail,
  BarChart2,
  HelpCircle,
  UserRound
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Leads", icon: Target, path: "/dashboard/leads" },
  { title: "Chat", icon: MessageSquare, path: "/dashboard/conversations", badge: 2 },
  { title: "Calendar", icon: Calendar, path: "/dashboard/calendar", badge: 1 },
  { title: "Lists", icon: List, path: "/dashboard/lists" },
  { title: "Mail", icon: Mail, path: "/dashboard/mail" },
  { title: "Stats", icon: BarChart2, path: "/dashboard/stats" },
  { title: "Settings", icon: Settings, path: "/dashboard/settings" },
  { title: "Help Center", icon: HelpCircle, path: "/dashboard/help" },
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
      <Sidebar collapsible="icon" className="bg-[#1C2434]">
        <SidebarContent>
          <SidebarHeader>
            <div className="flex items-center justify-start px-4 py-2">
              <span className="text-sm font-medium text-white">John Doe</span>
            </div>
          </SidebarHeader>
          <div className="px-2 py-2">
            {menuItems.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.title}
                className={cn(
                  "relative w-full",
                  location.pathname === item.path ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Link to={item.path} className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                  {item.badge && (
                    <span className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            ))}
          </div>

          <div className="mt-auto px-2 pb-4">
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              className="w-full text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Link to="/dashboard/profile" className="flex items-center gap-3">
                <UserRound className="h-5 w-5" />
                <span className="text-sm">Profile</span>
              </Link>
            </SidebarMenuButton>
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
