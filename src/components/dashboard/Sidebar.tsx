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
  Users, // Import Teams icon
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
// Button import removed as it's no longer used for the hamburger menu here
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

export type MenuItem = {
  title: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
};

export const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Leads", icon: Target, path: "/dashboard/leads" },
  { title: "Chat", icon: MessageSquare, path: "/dashboard/conversations" },
  { title: "Broadcasts", icon: RadioTower, path: "/dashboard/broadcasts" }, // Add Broadcasts item
  // { title: "Calendar", icon: Calendar, path: "/dashboard/calendar" },
  { title: "Lists", icon: List, path: "/dashboard/lists" },
  { title: "Knowledge", icon: BookOpen, path: "/dashboard/knowledge" },
  { title: "AI Agents", icon: Bot, path: "/dashboard/ai-agents" }, // Add AI Agents item
  { title: "Teams", icon: Users, path: "/dashboard/teams" }, // Add Teams item
  { title: "Stats", icon: BarChart2, path: "/dashboard/stats" },
  { title: "Settings", icon: Settings, path: "/dashboard/settings" },
  { title: "Help", icon: HelpCircle, path: "/dashboard/help" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, setOpenMobile, isMobile, state } = useSidebar(); // Get setOpenMobile, isMobile, and state
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
      {/* Hamburger menu button removed, now handled in DashboardLayout.tsx */}
      {/* Apply primary background and secondary text for base sidebar style */}
      <Sidebar collapsible="icon" variant="floating"> {/* Set variant to floating */}
        <SidebarContent className="ml-2"> {/* Added ml-2 for left indent */}
          {/* Restored p-2 to this div, as it represents a content group inside the card */}
          <div className="p-2"> 
            {menuItems.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className={cn(
                    "relative w-full", // Removed pl-3, relying on default p-2 from SidebarMenuButton variant
                    location.pathname === item.path 
                      ? "bg-muted text-accent-foreground" // Active: Muted bg, Accent text
                      : "text-foreground hover:bg-accent/10" // Inactive: Default text, subtle accent hover
                  )}
                >
                  <Link 
                  to={item.path} 
                  className="flex items-center gap-2" // Changed gap-3 to gap-2
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

          {/* Restored p-2 to this div */}
          <div className="mt-auto p-2"> 
            {/* Desktop collapse/expand button removed, now handled in DashboardLayout.tsx */}
             <SidebarMenuButton
               asChild
                tooltip="Profile"
                  className={cn(
                    "w-full", // Removed pl-3
                    location.pathname === "/dashboard/profile" 
                      ? "bg-muted text-accent-foreground" // Active: Muted bg, Accent text
                      : "text-foreground hover:bg-accent/10" // Inactive: Default text, subtle accent hover
                  )}
                >
                  <Link 
                  to="/dashboard/profile" 
                  className="flex items-center gap-2" // Changed gap-3 to gap-2
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
                className="w-full text-foreground hover:bg-accent/10 mt-2" // Removed pl-3
              >
                <div className="flex items-center gap-2"> {/* Changed gap-3 to gap-2 */}
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
