
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "../../types";
import { useQueryClient } from "@tanstack/react-query";

export function useRealTimeUpdates(
  isExpanded: boolean,
  lead: Lead | null,
  selectedConversationId: string | undefined
) {
  const queryClient = useQueryClient();

  // Set up global lead_pipeline realtime subscription
  useEffect(() => {
    if (!isExpanded) return;

    console.log('Setting up global lead_pipeline realtime subscription');
    const leadPipelineChannel = supabase
      .channel('lead-pipeline-global-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline'
        },
        (payload) => {
          console.log('Lead pipeline change detected:', payload);
          if (lead?.id && payload.new && 
              typeof payload.new === 'object' && 
              'lead_id' in payload.new && 
              payload.new.lead_id === lead.id) {
            console.log('Current lead pipeline was updated, refetching lead data');
            
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversationId] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global lead_pipeline subscription');
      supabase.removeChannel(leadPipelineChannel);
    };
  }, [isExpanded, lead?.id, selectedConversationId, queryClient]);
}
