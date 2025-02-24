
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeadsHeader } from "./LeadsHeader";
import { LeadsStage } from "./LeadsStage";

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
};

interface LeadsContentProps {
  pipelineId: string | null;
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStages() {
      if (!pipelineId) {
        setIsLoading(false);
        return;
      }

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
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <LeadsHeader />
      <div className="flex-1 p-6 min-h-0">
        <div className="grid grid-cols-3 gap-4 h-full">
          {stages.map((stage) => (
            <LeadsStage 
              key={stage.id} 
              name={stage.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
