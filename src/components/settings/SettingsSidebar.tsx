
import { 
  Settings, Package, CreditCard, 
  Users, MessageSquare, HelpCircle,
  ChevronLeft, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SettingsSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'integrations', label: 'Integrations', icon: Package },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'general', label: 'Settings', icon: Settings },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'communication', label: 'Tools', icon: MessageSquare },
  { id: 'help', label: 'Support', icon: HelpCircle },
  { id: 'logout', label: 'Logout', icon: LogOut },
];

export function SettingsSidebar({ selectedSection, onSectionChange }: SettingsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleItemClick = async (itemId: string) => {
    if (itemId === 'logout') {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to log out. Please try again.",
        });
      } else {
        navigate("/login");
      }
    } else {
      onSectionChange(itemId);
    }
  };

  return (
    <div className={cn(
      "border-r bg-muted/30 transition-all duration-300 relative flex flex-col",
      isCollapsed ? "w-14" : "w-48"
    )}>
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate",
              item.id === 'logout' ? "text-destructive hover:bg-destructive/10" :
              selectedSection === item.id 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent",
          "transition-transform",
          isCollapsed && "rotate-180"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}
