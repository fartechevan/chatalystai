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
  LogOut,
  ChevronRight, // Added for collapsible icon
  FileText, // Added for Reports icon (though Reports is removed, keeping import for now)
  PieChart, // Added for Segments icon
  Database, // Added for Database icon
  DollarSign, // Added for Billing icon
  Link as LinkIcon, // Added for Integrations icon, aliased to avoid conflict with React Router Link
  ShieldCheck, // Added for Access Control icon
} from "lucide-react";
import React from "react"; // Added for useState
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // Added for collapsible component
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

export type SubMenuItem = {
  title: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
};

export type MenuItem = {
  id: string; // Added id for state management of collapsibles
  title: string;
  icon: React.ElementType;
  path?: string; // Path is optional now, for parent collapsible items
  badge?: number;
  subItems?: SubMenuItem[];
};

export const menuItems: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", icon: Home, path: "/dashboard" },
  { id: "chat", title: "Chat", icon: MessageSquare, path: "/dashboard/conversations" },
  { id: "broadcasts", title: "Broadcasts", icon: RadioTower, path: "/dashboard/broadcasts" },
  { id: "leads", title: "Leads", icon: Target, path: "/dashboard/leads" },
  { id: "contacts", title: "Contacts", icon: Users, path: "/dashboard/contacts" }, // Re-adding Contacts, will point to customers data
  // { 
  //   id: "lists", 
  //   title: "Lists", 
  //   icon: List, 
  //   path: "/dashboard/lists",
  // }, // "Lists" item removed
  { id: "knowledge", title: "Knowledge", icon: BookOpen, path: "/dashboard/knowledge" },
  { id: "ai-agents", title: "AI Agents", icon: Bot, path: "/dashboard/ai-agents" },
  // { id: "automation", title: "Reply Configuration", icon: RadioTower, path: "/dashboard/automation" }, // Removed Reply Configuration link
  // { id: "teams", title: "Teams", icon: Users, path: "/dashboard/teams" }, // Removed Teams link
  {
    id: "management",
    title: "Management",
    icon: Settings, // Using Settings icon for Management group
    subItems: [
      // { title: "Contacts", icon: Users, path: "/dashboard/contacts" }, // Removed Contacts
      { title: "Segments", icon: PieChart, path: "/dashboard/segments" },
    ],
  },
  { id: "stats", title: "Stats", icon: BarChart2, path: "/dashboard/stats" },
  {
    id: "settings",
    title: "Settings",
    icon: Settings, // Note: duplicate icon with Management
    // path: "/dashboard/settings", // Path removed as it's now a parent
    subItems: [
      { title: "Billing", icon: DollarSign, path: "/dashboard/settings/billing" },
      { title: "Users", icon: Users, path: "/dashboard/settings/users" },
      // { title: "Access Control", icon: ShieldCheck, path: "/dashboard/settings/access-control" }, // Removed Access Control
      { title: "Integrations", icon: LinkIcon, path: "/dashboard/settings/integrations" },
      { title: "Database", icon: Database, path: "/dashboard/settings/database" },
    ],
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, setOpenMobile, isMobile, state } = useSidebar();
  const { user } = useAuth();
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({
    "management": false,
    "settings": false, // Added settings to collapsible state
  });

  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
          {menuItems.map((item) => {
            if (item.subItems) {
              return (
                <Collapsible
                  key={item.id}
                  open={openCollapsibles[item.id] || false}
                  onOpenChange={() => toggleCollapsible(item.id)}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "relative w-full flex justify-between items-center",
                        // Add active styling for parent if a sub-item is active, if desired
                        // location.pathname.startsWith(item.pathPrefixForSubItems) ? "bg-muted text-accent-foreground" : "text-foreground hover:bg-accent/10"
                        "text-foreground hover:bg-accent/10" 
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span className="text-sm">{item.title}</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openCollapsibles[item.id] && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                    <div className="pl-4 py-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <SidebarMenuButton
                          key={subItem.title}
                          asChild
                          isActive={location.pathname === subItem.path}
                          tooltip={subItem.title}
                          className={cn(
                            "relative w-full text-sm font-normal", // Adjusted for sub-item
                            location.pathname === subItem.path
                              ? "bg-muted text-accent-foreground"
                              : "text-foreground hover:bg-accent/10"
                          )}
                        >
                          <Link
                            to={subItem.path}
                            className="flex items-center gap-2"
                            onClick={handleLinkClick}
                          >
                            <subItem.icon className="h-4 w-4" /> {/* Slightly smaller icon for sub-items */}
                            <span className="text-sm">{subItem.title}</span>
                            {subItem.badge ? (
                              <span className="absolute right-2 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                                {subItem.badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            // Regular item
            return (
              <SidebarMenuButton
                key={item.id}
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.title}
                className={cn(
                  "relative w-full",
                  location.pathname === item.path
                    ? "bg-muted text-accent-foreground"
                    : "text-foreground hover:bg-accent/10"
                )}
              >
                <Link
                  to={item.path!} // Path must exist for non-collapsible items
                  className="flex items-center gap-2"
                  onClick={handleLinkClick}
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
            );
          })}
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
