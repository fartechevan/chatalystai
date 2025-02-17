
import { 
  Settings, Package, CreditCard, 
  Users, MessageSquare, Brain,
  HelpCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

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
];

export function SettingsSidebar({ selectedSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-48 border-r bg-muted/30">
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              selectedSection === item.id 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
