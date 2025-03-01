
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead, PipelineStage } from "../types";

export function usePipelineData(leadId: string | null) {
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPipelineData = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      // Fetch the pipeline data for this lead
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('lead_pipeline')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (pipelineError && pipelineError.code !== 'PGRST116') {
        console.error('Error fetching pipeline data:', pipelineError);
      }

      if (pipelineData && pipelineData.stage_id) {
        setCurrentStageId(pipelineData.stage_id);
        setCurrentPipelineId(pipelineData.pipeline_id);
        
        // Fetch all stages for this pipeline
        const { data: stagesData, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipelineData.pipeline_id)
          .order('position');

        if (stagesError) {
          console.error('Error fetching pipeline stages:', stagesError);
        } else {
          setPipelineStages(stagesData || []);
        }
      }
    } catch (error) {
      console.error('Error in fetchPipelineData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      console.log('Lead ID changed in usePipelineData, fetching new data:', leadId);
      setCurrentStageId(null);
      setCurrentPipelineId(null);
      setPipelineStages([]);
      fetchPipelineData();
    }
  }, [leadId]);

  return {
    currentPipelineId,
    currentStageId,
    pipelineStages,
    isLoading,
    refetchPipelineData: fetchPipelineData
  };
}
