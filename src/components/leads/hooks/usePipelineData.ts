
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/components/dashboard/conversations/types";
import { useToast } from "@/hooks/use-toast";

// Define an intermediate type for the expected shape from Supabase query result
type SupabaseLeadWithRelations = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assignee_id?: string | null;
  value: number;
  customer_id: string;
  // Make customers optional as it's not fetched by the simplified query
  customers?: { 
    company_name?: string | null;
    name?: string | null;
    // Add other customer fields if needed
  } | null;
  // Make lead_tags optional as it's not fetched by the simplified query
  lead_tags?: { 
    tags: { 
      id: string;
      name: string;
    } | null;
  }[] | null;
  // Add any other fields selected by '*' from the leads table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other properties from '*'
};


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
            position, 
            leads (*) 
          `) // Removed comment
          .eq('stage_id', stage.id)
          .order('position');

        if (leadsError) {
          console.error('Error fetching leads for stage', stage.id, leadsError);
          leadsData[stage.id] = [];
        } else {
          // Filter out any null leads and ensure they match our interface
          const validLeads = stageLeadsData
            ?.filter(item => item.leads !== null) // Check item.leads
            .map(item => {
              if (item.leads) { // Check item.leads
                // Cast to the specific intermediate type instead of any
                const lead = item.leads as SupabaseLeadWithRelations; // Use item.leads
                const typedLead: Lead = {
                  id: lead.id,
                  created_at: lead.created_at,
                  updated_at: lead.updated_at || lead.created_at,
                  user_id: lead.user_id,
                  assignee_id: lead.assignee_id || null, // Ensure null if undefined/missing
                  value: lead.value || 0,
                  customer_id: lead.customer_id || '',
                  pipeline_stage_id: stage.id
                  // Removed tags mapping
                  // Removed virtual properties mapping (will be handled in details panel)
                };
                return typedLead;
              }
              return null;
            })
            .filter((lead): lead is Lead => lead !== null);
          
          leadsData[stage.id] = validLeads || [];
         }
       }
       
       console.log("Final leads data structure:", JSON.stringify(leadsData, null, 2)); // Add detailed log
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
