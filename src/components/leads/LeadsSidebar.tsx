
import { 
  Plus, GripVertical, ChevronLeft,
  Users, CircleDollarSign, Settings,
  Archive, Trash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeadsSidebarProps {
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

const menuItems = [
  { id: 'active', label: 'Active Leads', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: CircleDollarSign },
  { id: 'settings', label: 'Pipeline Settings', icon: Settings },
  { id: 'archived', label: 'Archived', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash },
];

export function LeadsSidebar({
  selectedPipelineId,
  onPipelineSelect,
  isCollapsed,
  onCollapse,
}: LeadsSidebarProps) {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string; }>>([]);
  
  const handleItemClick = async (itemId: string) => {
    if (itemId === 'trash') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the trash.",
        variant: "destructive",
      });
      return;
    }
    onPipelineSelect(itemId);
  };

  return (
    <div className={cn(
      "border-r bg-muted/30 transition-all duration-300 relative flex flex-col",
      isCollapsed ? "" : "w-48"
    )}>
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate",
              item.id === 'trash' ? "text-destructive hover:bg-destructive/10" :
              selectedPipelineId === item.id 
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
      <div className="mt-2 px-3">
        <button
          onClick={() => toast({ title: "Coming soon", description: "This feature is not yet available." })}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>New Pipeline</span>}
        </button>
      </div>
      <button
        onClick={onCollapse}
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
