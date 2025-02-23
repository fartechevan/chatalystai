
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanStage } from "./KanbanStage";

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
};

interface PipelineContentProps {
  pipelineId: string | null;
}

export function PipelineContent({ pipelineId }: PipelineContentProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStages() {
      if (!pipelineId) return;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (error) {
        console.error('Error fetching stages:', error);
        return;
      }

      setStages(data);
      setIsLoading(false);
    }

    fetchStages();
  }, [pipelineId]);

  if (!pipelineId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a pipeline to view its stages
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <KanbanHeader />
      <div className="flex-1 min-h-0 p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {stages.map((stage) => (
            <KanbanStage 
              key={stage.id} 
              name={stage.name}
            />
          ))}
        </div>
      </div>
    </>
  );
}
