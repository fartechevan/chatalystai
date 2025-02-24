
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
  }, [user, selectedPipelineId, onPipelineSelect]);

  return (
    <div className={cn(
      "h-full border-r bg-background transition-all duration-300",
      isCollapsed ? "w-0" : "w-64"
    )}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pipelines</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {pipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => onPipelineSelect(pipeline.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                selectedPipelineId === pipeline.id 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              <GripVertical className="h-4 w-4" />
              {!isCollapsed && <span>{pipeline.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Plus className="h-4 w-4 mr-2" />
            Add pipeline
          </Button>
        </div>
      </div>
      <button
        onClick={onCollapse}
        className={cn(
          "absolute top-3 -right-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent",
          "transition-transform",
          isCollapsed && "rotate-180"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}
