
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
  { id: 'general', label: 'General settings', icon: Settings },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'communication', label: 'Communication tools', icon: MessageSquare },
  { id: 'help', label: 'Help Center', icon: HelpCircle },
];

export function SettingsSidebar({ selectedSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm",
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
