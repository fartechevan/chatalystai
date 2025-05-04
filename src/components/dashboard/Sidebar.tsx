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
  UserRound,
  RadioTower, // Import Broadcast icon
  BookOpen,
  Bot, // Import AI Agent icon
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

type MenuItem = {
  title: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
};

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Leads", icon: Target, path: "/dashboard/leads" },
  { title: "Chat", icon: MessageSquare, path: "/dashboard/conversations" },
  { title: "Broadcasts", icon: RadioTower, path: "/dashboard/broadcasts" }, // Add Broadcasts item
  // { title: "Calendar", icon: Calendar, path: "/dashboard/calendar" },
  { title: "Lists", icon: List, path: "/dashboard/lists" },
  { title: "Knowledge", icon: BookOpen, path: "/dashboard/knowledge" },
  { title: "AI Agents", icon: Bot, path: "/dashboard/ai-agents" }, // Add AI Agents item
  { title: "Stats", icon: BarChart2, path: "/dashboard/stats" },
  { title: "Settings", icon: Settings, path: "/dashboard/settings" },
  { title: "Help", icon: HelpCircle, path: "/dashboard/help" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, setOpenMobile, isMobile } = useSidebar(); // Get setOpenMobile and isMobile
  const { user } = useAuth();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false); // Close sidebar on mobile after link click
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "You have been logged out successfully",
      });
      
      navigate("/login");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden" // Reverted z-index to z-50
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      {/* Apply primary background and secondary text for base sidebar style */}
      <Sidebar collapsible="icon" className="bg-primary text-secondary"> 
        <SidebarContent>
          <div className="px-2 py-2">
            {menuItems.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className={cn(
                    "relative w-full",
                    location.pathname === item.path 
                      ? "bg-secondary text-secondary-foreground" // Active: Light teal bg, dark teal text
                      : "text-secondary hover:bg-primary hover:text-primary-foreground" // Inactive: Light teal text, hover white text
                  )}
                >
                  <Link 
                  to={item.path} 
                  className="flex items-center gap-3"
                  onClick={handleLinkClick} // Add onClick handler
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                  {item.badge ? (
                    <span className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </SidebarMenuButton>
            ))}
          </div>

          <div className="mt-auto px-2 pb-4">
             <SidebarMenuButton
               asChild
                tooltip="Profile"
                  className={cn(
                    "w-full",
                    location.pathname === "/dashboard/profile" 
                      ? "bg-secondary text-secondary-foreground" // Active: Light teal bg, dark teal text
                      : "text-secondary hover:bg-primary hover:text-primary-foreground" // Inactive: Light teal text, hover white text
                  )}
                >
                  <Link 
                  to="/dashboard/profile" 
                  className="flex items-center gap-3"
                  onClick={handleLinkClick} // Add onClick handler
                >
                  <UserRound className="h-5 w-5" />
                  <span className="text-sm">Profile</span>
              </Link>
            </SidebarMenuButton>
            
              <SidebarMenuButton
                tooltip="Logout"
                onClick={handleLogout}
                 // Apply inactive styling logic
                className="w-full text-secondary hover:bg-primary hover:text-primary-foreground mt-2"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5" />
                <span className="text-sm">Logout</span>
              </div>
            </SidebarMenuButton>
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
