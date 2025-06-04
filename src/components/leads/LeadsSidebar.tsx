import { 
  Plus, 
  Users,
  PanelLeftClose, // Icon for collapsing
  PanelLeftOpen,   // Icon for expanding
  // Settings2 // Example icon, ensure it's used or remove
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"; // Import Button
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PipelineSetupDialog } from "./PipelineSetupDialog";

interface LeadsSidebarProps {
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  // isCollapsed: boolean; // Removed
  // onCollapse: () => void; // Removed
}

export function LeadsSidebar({
  selectedPipelineId,
  onPipelineSelect,
  // isCollapsed, // Removed
  // onCollapse, // Removed
}: LeadsSidebarProps) {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const loadPipelines = async () => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('id, name, is_default')
      .order('created_at');

    if (error) {
      console.error('Error loading pipelines:', error);
      toast({
        title: "Error",
        description: "Failed to load pipelines",
        variant: "destructive",
      });
      return;
    }

    setPipelines(data || []);

    // If no pipeline is selected, select the default one
    if (!selectedPipelineId && data && data.length > 0) {
      const defaultPipeline = data.find(p => p.is_default) || data[0];
      onPipelineSelect(defaultPipeline.id);
    }
  };

  useEffect(() => {
    loadPipelines();
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // Run only once on mount

  return (
    <div className={cn(
      "border-r bg-background transition-all duration-300 relative flex flex-col h-full", 
      // Width and visibility are now controlled by the parent (LeadsLayout or SheetContent)
    )}>
      {/* Header-like section removed or simplified */}
      {/* The div below can be removed if no header elements remain, or kept for styling if other elements are added later */}
      {/* For now, let's assume we remove the header section entirely if only the button and title were there */}
      {/* <div className={cn("flex items-center border-b h-[57px] justify-center")}></div> */} {/* Example if it were to be always collapsed height */}
      <nav className={cn("flex-grow px-3 py-2 space-y-1 pt-4", "overflow-y-auto")}> {/* Removed isCollapsed logic, default to expanded style */}
        {pipelines.map((pipeline) => (
          <Button
            key={pipeline.id}
            variant={selectedPipelineId === pipeline.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 text-sm truncate",
              "px-3" // Default to expanded padding
            )}
            onClick={() => onPipelineSelect(pipeline.id)}
            title={pipeline.name}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{pipeline.name}</span> {/* Always show name */}
          </Button>
        ))}
      </nav>
      <div className={cn("mt-auto border-t p-3")}> {/* Removed isCollapsed logic, default to expanded style */}
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-sm",
            "px-3" // Default to expanded padding
          )}
          onClick={() => setIsSetupOpen(true)}
          title="New Pipeline"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span>New Pipeline</span> {/* Always show name */}
        </Button>
      </div>
      {/* The old collapse button was moved to the header-like section above.
          The comment block below was causing a syntax error.
      */}
      {/*
      <button
        onClick={onCollapse}
        className={cn(
          "absolute -right-3 top-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent",
          "transition-transform", 
        )}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" /> 
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
        <span className="sr-only">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
      </button>
      */}

      <PipelineSetupDialog
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSave={loadPipelines}
      />
    </div>
  );
}
