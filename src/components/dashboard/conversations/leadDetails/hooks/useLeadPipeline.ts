
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pipeline, PipelineStage } from "../../types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Conversation, Lead } from "../../types";

export function useLeadPipeline(
  lead: Lead | null,
  selectedConversation: Conversation | null,
  isExpanded: boolean
) {
  const { toast } = useToast();
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const queryClient = useQueryClient();

  const fetchAllPipelines = useCallback(async () => {
    try {
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .order('name');
        
      if (pipelinesError) {
        console.error('Error fetching all pipelines:', pipelinesError);
        return;
      }
      
      if (pipelinesData && pipelinesData.length > 0) {
        const pipelinesWithStages = await Promise.all(
          pipelinesData.map(async (pipeline) => {
            const { data: stagesData, error: stagesError } = await supabase
              .from('pipeline_stages')
              .select('id, name, position, pipeline_id')
              .eq('pipeline_id', pipeline.id)
              .order('position');
            
            if (stagesError) {
              console.error(`Error fetching stages for pipeline ${pipeline.id}:`, stagesError);
              return { ...pipeline, stages: [] };
            }
            
            return { ...pipeline, stages: stagesData || [] };
          })
        );
        
        setAllPipelines(pipelinesWithStages);
        
        const defaultPipeline = pipelinesWithStages.find(p => p.is_default) || pipelinesWithStages[0];
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline);
          
          if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
            setSelectedStage(defaultPipeline.stages[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  }, []);

  const findAndSelectStage = useCallback(async (stageId: string) => {
    if (!stageId) return;
    
    console.log("Finding stage:", stageId);

    if (allPipelines.length > 0) {
      for (const pipeline of allPipelines) {
        if (!pipeline.stages) continue;
        
        const stage = pipeline.stages.find(s => s.id === stageId);
        if (stage) {
          console.log("Found stage in existing pipelines:", stage.name);
          setSelectedPipeline(pipeline);
          setSelectedStage(stage);
          return;
        }
      }
    }
    
    try {
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, pipeline_id')
        .eq('id', stageId)
        .maybeSingle();
      
      if (stageError) {
        console.error('Error fetching stage:', stageError);
        return;
      }
      
      if (stageData) {
        console.log("Fetched stage data:", stageData);
        const { data: pipelineData, error: pipelineError } = await supabase
          .from('pipelines')
          .select('*')
          .eq('id', stageData.pipeline_id)
          .maybeSingle();
          
        if (pipelineError) {
          console.error('Error fetching pipeline:', pipelineError);
          return;
        }
        
        if (pipelineData) {
          console.log("Fetched pipeline data:", pipelineData);
          const { data: stagesData, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('id, name, position, pipeline_id')
            .eq('pipeline_id', stageData.pipeline_id)
            .order('position');
          
          if (stagesError) {
            console.error('Error fetching pipeline stages:', stagesError);
            return;
          }
          
          if (stagesData) {
            console.log("Fetched pipeline stages:", stagesData);
            const pipelineWithStages: Pipeline = {
              id: pipelineData.id,
              name: pipelineData.name,
              is_default: pipelineData.is_default,
              stages: stagesData
            };
            
            const stage = stagesData.find(s => s.id === stageId);
            if (stage) {
              console.log("Setting selected stage:", stage.name);
              setSelectedStage(stage);
            }
            
            console.log("Setting selected pipeline:", pipelineData.name);
            setSelectedPipeline(pipelineWithStages);
            
            setAllPipelines(prev => {
              const exists = prev.some(p => p.id === pipelineWithStages.id);
              if (!exists) {
                return [...prev, pipelineWithStages];
              }
              
              return prev.map(p => 
                p.id === pipelineWithStages.id ? pipelineWithStages : p
              );
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stage and pipeline:', error);
    }
  }, [allPipelines]);

  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    setSelectedPipeline(pipeline);
    
    if (pipeline.stages && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0]);
      if (lead?.id) {
        handleStageChange(pipeline.stages[0].id);
      }
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!lead || !selectedPipeline) return;
    
    const stage = selectedPipeline.stages?.find(s => s.id === stageId);
    if (stage) {
      console.log(`Changing stage for lead ${lead.id} to ${stage.name} (${stageId})`);
      
      setSelectedStage(stage);
      
      if (lead.id) {
        try {
          const { error } = await supabase
            .from('leads')
            .update({ pipeline_stage_id: stageId })
            .eq('id', lead.id);
          
          if (error) {
            console.error('Error updating lead stage:', error);
            toast({
              title: "Error",
              description: "Failed to update lead stage",
              variant: "destructive"
            });
            return;
          }
          
          console.log(`Updated lead ${lead.id} to stage ${stage.name}`);
          
          const { error: pipelineError } = await supabase
            .from('lead_pipeline')
            .update({ stage_id: stageId })
            .eq('lead_id', lead.id);
              
          if (pipelineError) {
            console.error('Error updating lead_pipeline:', pipelineError);
            toast({
              title: "Error",
              description: "Failed to update pipeline stage",
              variant: "destructive"
            });
            return;
          }
          
          queryClient.invalidateQueries({ 
            queryKey: ['lead', selectedConversation?.conversation_id] 
          });
          
          queryClient.invalidateQueries({ 
            queryKey: ['conversations'] 
          });
          
          toast({
            title: "Success",
            description: `Lead moved to "${stage.name}" stage`,
          });
        } catch (error) {
          console.error('Error:', error);
          toast({
            title: "Error",
            description: "Something went wrong",
            variant: "destructive"
          });
        }
      }
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchAllPipelines();
    }
  }, [isExpanded, fetchAllPipelines]);

  useEffect(() => {
    if (lead?.pipeline_stage_id) {
      console.log("Lead has pipeline_stage_id:", lead.pipeline_stage_id);
      findAndSelectStage(lead.pipeline_stage_id);
    } else if (selectedPipeline?.stages && selectedPipeline.stages.length > 0) {
      console.log("Setting default stage");
      setSelectedStage(selectedPipeline.stages[0]);
    }
  }, [lead, findAndSelectStage, selectedPipeline]);

  return {
    allPipelines,
    selectedPipeline,
    selectedStage,
    handlePipelineChange,
    handleStageChange,
    findAndSelectStage
  };
}
