
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsHeader } from "./LeadsHeader";
import { LeadsStage } from "./LeadsStage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeadsContentProps {
  pipelineId: string | null;
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStages() {
      if (!pipelineId) return;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (!error && data) {
        setStages(data);
      }
      setLoading(false);
    }

    loadStages();
  }, [pipelineId]);

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
    </div>
  );
}
