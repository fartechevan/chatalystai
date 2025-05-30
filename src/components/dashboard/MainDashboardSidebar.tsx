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

  return (
    <div className="border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Dashboard</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {initialMenuItems.map((item) => {
            if (item.subItems) {
              // This block can be kept for future collapsible items
              // Ensure 'openCollapsibles' and 'toggleCollapsible' are defined if this is used.
              // For now, assuming no default collapsible items, this part might not be hit.
              // If you re-add collapsible items to initialMenuItems, ensure state is managed.
              const isOpen = false; // Placeholder: replace with actual state like openCollapsibles[item.id]
              const toggle = () => {}; // Placeholder: replace with actual toggleCollapsible(item.id)
              return (
                <Collapsible
                  key={item.id}
                  open={isOpen}
                  onOpenChange={toggle}
                  className="w-full"
                  data-slot="collapsible"
                  data-sidebar="menu-item"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between items-center gap-2 h-10"
                      data-slot="collapsible-trigger"
                      data-sidebar="menu-button"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-90"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent
                    className="py-1 pl-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden"
                    data-slot="collapsible-content"
                  >
                    <ul className="space-y-1 pt-1" data-slot="sidebar-menu-sub" data-sidebar="menu-sub">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.id} data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 h-9 text-sm font-normal"
                            asChild
                          >
                            <a href={subItem.href} className="flex w-full items-center gap-2" data-slot="sidebar-menu-sub-button" data-sidebar="menu-sub-button">
                              {subItem.icon && <subItem.icon className="h-4 w-4 flex-shrink-0 mr-0.5" />}
                              <span>{subItem.label}</span>
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            } else if (item.panelId) {
              return (
                <Button
                  key={item.id}
                  variant={selectedPanel === item.panelId ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 h-10",
                    selectedPanel === item.panelId && "bg-muted font-medium"
                  )}
                  onClick={() => onSelect(item.panelId!)}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Button>
              );
            } else if (item.href) {
              // Handle top-level link items
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start gap-2 h-10"
                  asChild
                >
                  <a href={item.href} title={item.label}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </a>
                </Button>
              );
            }
            return null;
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
