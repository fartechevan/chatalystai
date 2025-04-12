
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CircleDollarSign, 
  CreditCard, 
  Settings, 
  ShoppingBag, 
  Users, 
  Webhook, 
  MessageCircle,
  Shield,
  PanelLeftClose, // Added
  PanelLeftOpen   // Added
} from "lucide-react";
import { cn } from "@/lib/utils"; // Added cn

interface SettingsSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean; // Added prop
  onCollapse: () => void; // Added prop
}

export function SettingsSidebar({
  selectedSection,
  onSectionChange,
  isCollapsed, // Added prop
  onCollapse, // Added prop
}: SettingsSidebarProps) {
  const sidebarItems = [
    { id: "account", label: "Account", icon: Settings },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "users", label: "Users", icon: Users },
    { id: "access", label: "Access Control", icon: Shield },
    { id: "integrations", label: "Integrations", icon: MessageCircle },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "subscriptions", label: "Subscriptions", icon: CircleDollarSign },
  ];

  return (
    // Removed pb-12, Added relative positioning, h-full, transition
    // Removed min-w-64, width is controlled by parent
    <div className={cn(
      "bg-muted/40 h-full flex flex-col relative transition-all duration-300",
      isCollapsed ? "items-center" : "" 
    )}>
      {/* Header */}
      <div className={cn("py-8 border-b", isCollapsed ? "px-2" : "px-6")}>
        <h2 className={cn("text-lg font-semibold", isCollapsed ? "hidden" : "")}>Settings</h2>
        <p className={cn("text-sm text-muted-foreground", isCollapsed ? "hidden" : "")}>
          Manage your account settings and preferences.
        </p>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 py-2"> 
        {/* Standardize padding within scroll area */}
        <div className="px-2"> 
          {sidebarItems.map((item) => (
            <Button
              key={item.id}
              variant={selectedSection === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full mb-1", // Removed justify-start here, apply conditionally
                isCollapsed ? "justify-center" : "justify-start" // Apply correct justification
              )}
              onClick={() => onSectionChange(item.id)}
              title={item.label} // Add title for collapsed view
            >
              <item.icon className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
              <span className={cn(isCollapsed ? "hidden" : "")}>{item.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Collapse Button - Rendered conditionally by parent layout */}
      {/* We add the button structure here, but parent controls visibility */}
       <button
          onClick={onCollapse}
          className={cn(
            "absolute -right-3 top-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent",
            "transition-transform hidden md:inline-flex" // Initially hidden, parent shows on desktop
          )}
          title={isCollapsed ? 'Expand settings menu' : 'Collapse settings menu'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" /> 
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
    </div>
  );
}
