
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/components/dashboard/conversations/types";
import { useToast } from "@/hooks/use-toast";

export interface StageLeads {
  [key: string]: Lead[];
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export function usePipelineData(pipelineId: string | null) {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [stageLeads, setStageLeads] = useState<StageLeads>({});
  const [loading, setLoading] = useState(true);

  const loadStages = async () => {
    if (!pipelineId) {
      setLoading(false);
      return;
    }
    
    console.log("Loading stages for pipeline:", pipelineId);
    
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (error) {
      console.error('Error fetching stages:', error);
      setLoading(false);
      return;
    }
    
    if (data) {
      console.log("Loaded stages:", data);
      setStages(data);
      
      const leadsData: StageLeads = {};
      for (const stage of data) {
        const { data: stageLeadsData, error: leadsError } = await supabase
          .from('lead_pipeline')
          .select(`
            lead:leads (
              id,
              name,
              value,
              company_name,
              contact_first_name,
              customer_id,
              created_at,
              user_id
            )
          `)
          .eq('stage_id', stage.id)
          .order('position');

        if (leadsError) {
          console.error('Error fetching leads for stage', stage.id, leadsError);
          leadsData[stage.id] = [];
        } else {
          // Filter out any null leads and ensure they match our interface
          const validLeads = stageLeadsData
            ?.filter(item => item.lead !== null)
            .map(item => {
              if (item.lead) {
                return {
                  id: item.lead.id,
                  created_at: item.lead.created_at,
                  user_id: item.lead.user_id,
                  // Optional properties
                  name: item.lead.name || null,
                  value: item.lead.value || null,
                  company_name: item.lead.company_name || null,
                  contact_first_name: item.lead.contact_first_name || null,
                  customer_id: item.lead.customer_id || null,
                  pipeline_stage_id: stage.id
                } as Lead;
              }
              return null;
            })
            .filter((lead): lead is Lead => lead !== null);
          
          leadsData[stage.id] = validLeads || [];
        }
      }
      
      console.log("Loaded leads data:", leadsData);
      setStageLeads(leadsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadStages();
  }, [pipelineId]);

  return {
    stages,
    stageLeads,
    loading,
    loadStages
  };
}
