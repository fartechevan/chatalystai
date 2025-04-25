import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Rocket, BarChart2 } from "lucide-react"; // Icons for items

// Revert type to original
type DashboardPanel = "getting-started" | "analytics"; 

interface MainDashboardSidebarProps {
  selectedPanel: DashboardPanel;
  onSelect: (panel: DashboardPanel) => void;
}

// Remove AI Agents item
const menuItems = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
];

export function MainDashboardSidebar({ selectedPanel, onSelect }: MainDashboardSidebarProps) {
  return (
    <div className="border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Dashboard</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={selectedPanel === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 h-10",
                selectedPanel === item.id && "bg-muted font-medium"
              )}
              // Revert onClick type casting
              onClick={() => onSelect(item.id as "getting-started" | "analytics")} 
              title={item.label}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
