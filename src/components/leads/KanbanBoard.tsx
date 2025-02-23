
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PipelineSidebar } from "./PipelineSidebar";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanStage } from "./KanbanStage";

type Pipeline = {
  id: string;
  name: string;
  is_default: boolean;
};

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
};

export function KanbanBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

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
        setSelectedPipelineId(defaultPipeline.id);
      } else {
        setPipelines(pipelinesData);
        setSelectedPipelineId(pipelinesData[0]?.id);
      }
    }

    fetchPipelines();
  }, [user]);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full">
      <PipelineSidebar
        pipelines={pipelines}
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
