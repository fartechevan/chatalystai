
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
  value: number | null; // Allow null
  customer_id: string | null; // Allow null
  // Fetch related customer data
  customers: { 
    company_name?: string | null;
    name?: string | null;
    // Add other customer fields if needed (e.g., email, phone)
    email?: string | null;
    phone_number?: string | null;
    company_address?: string | null;
  } | null; // Customer can be null if customer_id is null or relation doesn't exist
  // Fetch related tags
  lead_tags: {
    tags: {
      id: string;
      name: string;
    } | null; // The tag itself might be null in rare cases? Better safe.
  }[] | null; // lead_tags array can be null if no tags
  // Ensure pipeline_stage_id is included if needed from leads table directly
  pipeline_stage_id: string | null; // Allow null
  // No need for [key: string]: any; if we explicitly list fields
};




export interface StageLeads {
  [key: string]: Lead[];
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

// Add selectedTagIds parameter
export function usePipelineData(pipelineId: string | null, selectedTagIds: string[] | null) {
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
         // Fetch leads with customer and tag details
         const { data: stageLeadsData, error: leadsError } = await supabase
           .from('lead_pipeline')
           .select(`
             position,
             leads (
               *,
               customers (name, company_name, email, phone_number, company_address),
               lead_tags (tags (id, name))
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
            ?.filter(item => item.leads !== null) // Check item.leads
            .map(item => {
              if (item.leads) { // Check item.leads
                // Cast to the specific intermediate type instead of any
                 const lead = item.leads as SupabaseLeadWithRelations;
                 // Map tags correctly
                 const tags = lead.lead_tags
                   ?.map(lt => lt.tags)
                   .filter((tag): tag is { id: string; name: string } => tag !== null) || null; // Handle null tags array or null individual tags

                 const typedLead: Lead = {
                   id: lead.id,
                   created_at: lead.created_at,
                   updated_at: lead.updated_at || lead.created_at,
                   user_id: lead.user_id,
                   assignee_id: lead.assignee_id || null,
                   value: lead.value ?? null, // Use nullish coalescing for value
                   customer_id: lead.customer_id ?? null, // Use nullish coalescing
                   pipeline_stage_id: stage.id, // Stage ID comes from the outer loop
                   tags: tags, // Assign mapped tags
                   // Map customer data
                   name: lead.customers?.name ?? undefined, // Use undefined if customer or name is null
                   company_name: lead.customers?.company_name ?? undefined,
                   contact_email: lead.customers?.email ?? undefined,
                   contact_phone: lead.customers?.phone_number ?? undefined,
                   company_address: lead.customers?.company_address ?? undefined,
                 };
                 return typedLead;
              }
              return null;
            })
            .filter((lead): lead is Lead => lead !== null);
          
          leadsData[stage.id] = validLeads || [];
         }
       }
       
       // Filter leads based on selected tags *after* fetching
       const filteredLeadsData: StageLeads = {};
       for (const stageId in leadsData) {
         if (selectedTagIds && selectedTagIds.length > 0) {
           filteredLeadsData[stageId] = leadsData[stageId].filter(lead =>
             lead.tags?.some(tag => selectedTagIds.includes(tag.id))
           );
         } else {
           // If no tags are selected, include all leads for the stage
           filteredLeadsData[stageId] = leadsData[stageId];
         }
       }

       console.log("Final filtered leads data structure:", JSON.stringify(filteredLeadsData, null, 2)); // Log filtered data
       setStageLeads(filteredLeadsData); // Set the filtered leads
     }

    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadStages();
  // Add selectedTagIds to dependency array
  }, [pipelineId, selectedTagIds]); 

  return {
    stages,
    stageLeads,
    loading,
    loadStages
  };
}
