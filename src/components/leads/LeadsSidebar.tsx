
import { 
  Plus, ChevronLeft,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PipelineSetupDialog } from "./PipelineSetupDialog";

interface LeadsSidebarProps {
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function LeadsSidebar({
  selectedPipelineId,
  onPipelineSelect,
  isCollapsed,
  onCollapse,
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
      let defaultPipeline = data.find(p => p.is_default);
      if (!defaultPipeline) {
        defaultPipeline = data[0];
      }
      onPipelineSelect(defaultPipeline.id);
    }
  };

  useEffect(() => {
    loadPipelines();
  }, [selectedPipelineId, onPipelineSelect]);

  return (
    <div className={cn(
      "border-r bg-muted/30 transition-all duration-300 relative flex flex-col",
      isCollapsed ? "" : "w-48"
    )}>
      <nav className="p-3 space-y-1">
        {pipelines.map((pipeline) => (
          <button
            key={pipeline.id}
            onClick={() => onPipelineSelect(pipeline.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate",
              selectedPipelineId === pipeline.id 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
            title={pipeline.name}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>{pipeline.name}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-2 px-3">
        <button
          onClick={() => setIsSetupOpen(true)}
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

      <PipelineSetupDialog
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSave={loadPipelines}
      />
    </div>
  );
}
