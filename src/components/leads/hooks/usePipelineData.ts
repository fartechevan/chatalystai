
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
       // console.log("Loaded stages:", data); // Removed log
       setStages(data);
       
       const leadsData: StageLeads = {};
      for (const stage of data) {
        const { data: stageLeadsData, error: leadsError } = await supabase
          .from('lead_pipeline')
          .select(`
            lead:leads (
              id,
              value,
              customer_id,
              created_at,
              updated_at,
              user_id,
              customers:customers (
                name,
                company_name,
                phone_number,
                email
              )
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
                const lead = item.lead;
                const typedLead: Lead = {
                  id: lead.id,
                  created_at: lead.created_at,
                  updated_at: lead.updated_at || lead.created_at,
                  user_id: lead.user_id,
                  value: lead.value || 0,
                  customer_id: lead.customer_id || '',
                  pipeline_stage_id: stage.id,
                  
                  // Virtual properties from customer data
                  company_name: lead.customers?.company_name,
                  name: lead.customers?.name
                };
                return typedLead;
              }
              return null;
            })
            .filter((lead): lead is Lead => lead !== null);
          
          leadsData[stage.id] = validLeads || [];
         }
       }
       
       // console.log("Loaded leads data:", leadsData); // Removed log
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
