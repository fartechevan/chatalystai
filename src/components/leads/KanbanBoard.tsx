
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PipelineSidebar } from "./PipelineSidebar";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanStage } from "./KanbanStage";

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
};

export function KanbanBoard() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStages() {
      if (!selectedPipelineId) return;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .order('position');

      if (error) {
        console.error('Error fetching stages:', error);
        return;
      }

      setStages(data);
      setIsLoading(false);
    }

    fetchStages();
  }, [selectedPipelineId]);

  const handlePipelineClick = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
  };

  if (isLoading && selectedPipelineId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full">
      <PipelineSidebar
        selectedPipelineId={selectedPipelineId}
        onPipelineSelect={handlePipelineClick}
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 flex flex-col">
        {selectedPipelineId && (
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
        )}
      </div>
    </div>
  );
}
