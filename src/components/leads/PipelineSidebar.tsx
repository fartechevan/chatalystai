
import { Plus, GripVertical, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type Pipeline = {
  id: string;
  name: string;
  is_default: boolean;
};

interface PipelineSidebarProps {
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function PipelineSidebar({
  selectedPipelineId,
  onPipelineSelect,
  isCollapsed,
  onCollapse,
}: PipelineSidebarProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    async function fetchPipelines() {
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .order('created_at');

      if (pipelinesError) {
        console.error('Error fetching pipelines:', pipelinesError);
        return;
      }

      if (pipelinesData.length === 0) {
        // Create default pipeline
        const { data: defaultPipeline, error: insertError } = await supabase
          .from('pipelines')
          .insert({
            name: 'Default Pipeline',
            is_default: true,
            user_id: user.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default pipeline:', insertError);
          return;
        }

        // Create default stages
        const defaultStages = [
          { name: 'Initial Contact', position: 0 },
          { name: 'Offer Made', position: 1 },
          { name: 'Negotiation', position: 2 }
        ];

        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(
            defaultStages.map(stage => ({
              ...stage,
              pipeline_id: defaultPipeline.id
            }))
          );

        if (stagesError) {
          console.error('Error creating default stages:', stagesError);
          return;
        }

        setPipelines([defaultPipeline]);
        onPipelineSelect(defaultPipeline.id);
      } else {
        setPipelines(pipelinesData);
        if (!selectedPipelineId) {
          onPipelineSelect(pipelinesData[0]?.id);
        }
      }
    }

    fetchPipelines();
  }, [user]);

  return (
    <div className={cn(
      "h-full border-r bg-muted/30 transition-all duration-300 relative",
      isCollapsed ? "w-0" : "w-48"
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
            <GripVertical className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>{pipeline.name}</span>}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          Add pipeline
        </Button>
      </nav>
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
