
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLeadsRealtime(pipelineId: string | null, onDataChange: () => void) {
  useEffect(() => {
    if (!pipelineId) return;

    const pipelineChannel = supabase
      .channel('lead-pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline'
        },
        (payload) => {
          console.log('Lead pipeline change detected:', payload);
          onDataChange();
        }
      )
      .subscribe();
      
    const leadsChannel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Leads change detected:', payload);
          onDataChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pipelineChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [pipelineId, onDataChange]);
}
