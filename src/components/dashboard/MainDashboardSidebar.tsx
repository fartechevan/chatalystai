import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Rocket, BarChart2, ChevronRight, Settings, Users, FileText } from "lucide-react"; // Added icons
import React from "react"; // Added for useState

type DashboardPanel = "getting-started" | "analytics";

interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  panelId?: DashboardPanel;
  subItems?: NavSubItem[];
}

interface MainDashboardSidebarProps {
  selectedPanel: DashboardPanel;
  onSelect: (panel: DashboardPanel) => void;
}

const initialMenuItems: NavItem[] = [
  { id: "panel-getting-started", label: "Getting Started", icon: Rocket, panelId: "getting-started" },
  { id: "panel-analytics", label: "Analytics", icon: BarChart2, panelId: "analytics" },
  // Moved Users and Reports to be top-level links
  { id: "link-users", label: "Users", icon: Users, href: "/users" },
  { id: "link-reports", label: "Reports", icon: FileText, href: "/reports" },
  // Example of another collapsible item if needed in the future
  // {
  //   id: "group-settings",
  //   label: "Settings",
  //   icon: Settings,
  //   subItems: [
  //     { id: "settings-profile", label: "Profile", href: "/profile", icon: Users /* Placeholder icon */ },
  //     { id: "settings-billing", label: "Billing", href: "/billing", icon: FileText /* Placeholder icon */ },
  //   ],
  // },
];

export function MainDashboardSidebar({ selectedPanel, onSelect }: MainDashboardSidebarProps) {
  // No longer need openCollapsibles state if no collapsible items are present by default
  // If you add collapsible items back, you'll need to re-introduce state management for them.
  // For example:
  // const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({
  //   "group-settings": false, // Default to closed or based on logic
  // });

  // const toggleCollapsible = (id: string) => {
  //   setOpenCollapsibles(prev => ({ ...prev, [id]: !prev[id] }));
  // };

  return null; // Removed the div and its content
}
