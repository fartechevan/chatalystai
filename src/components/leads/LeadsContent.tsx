
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsHeader } from "./LeadsHeader";
import { LeadsStage } from "./LeadsStage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";

interface LeadsContentProps {
  pipelineId: string | null;
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const { toast } = useToast();
  const [stages, setStages] = useState<Array<{ id: string; name: string; position: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStages() {
      if (!pipelineId) return;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, position')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (!error && data) {
        setStages(data);
      }
      setLoading(false);
    }

    loadStages();
  }, [pipelineId]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceStageId = result.source.droppableId;
    const destinationStageId = result.destination.droppableId;
    const leadId = result.draggableId;

    // Find source and destination stage indices
    const sourceStageIndex = stages.findIndex(stage => stage.id === sourceStageId);
    const destStageIndex = stages.findIndex(stage => stage.id === destinationStageId);

    // Prevent moving from stage 1 back to stage 0
    if (sourceStageIndex === 1 && destStageIndex === 0) {
      toast({
        title: "Operation not allowed",
        description: "Cannot move a lead back to the incoming stage",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the lead's stage in the database
      const { error } = await supabase
        .from('lead_pipeline')
        .update({
          stage_id: destinationStageId,
          position: result.destination.index
        })
        .eq('lead_id', leadId);

      if (error) throw error;

      // Successful move
      toast({
        title: "Lead moved",
        description: `Lead moved to ${stages[destStageIndex].name}`,
      });
    } catch (error) {
      console.error('Error moving lead:', error);
      toast({
        title: "Error",
        description: "Failed to move lead",
        variant: "destructive",
      });
    }
  };

  if (!pipelineId) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Select a Pipeline
          </h2>
          <p className="text-muted-foreground mt-2">
            Choose a pipeline from the sidebar to view and manage your leads.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-[40px] w-[300px] mb-6" />
        <div className="flex gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1">
              <Skeleton className="h-[200px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <LeadsHeader selectedPipelineId={pipelineId} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-6 min-w-max">
            {stages.map((stage, index) => (
              <LeadsStage
                key={stage.id}
                id={stage.id}
                name={stage.name}
                index={index}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
