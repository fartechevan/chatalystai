
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
  Shield
} from "lucide-react";

interface SettingsSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export function SettingsSidebar({
  selectedSection,
  onSectionChange,
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
    <div className="pb-12 min-w-64 bg-muted/40">
      <div className="px-6 py-8 border-b">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)] py-2">
        <div className="px-2">
          {sidebarItems.map((item) => (
            <Button
              key={item.id}
              variant={selectedSection === item.id ? "secondary" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => onSectionChange(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
