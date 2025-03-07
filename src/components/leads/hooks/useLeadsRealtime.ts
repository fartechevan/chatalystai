
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export function useLeadsRealtime(pipelineId: string | null, onDataChange: () => void) {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!pipelineId || !user) return;

    // Set up subscriptions for leads, pipeline_stages, and lead_pipeline tables
    const leadsChannel = supabase
      .channel('leads_realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'leads',
          filter: `user_id=eq.${user.id}`
        }, 
        () => onDataChange()
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'pipeline_stages',
          filter: `pipeline_id=eq.${pipelineId}`
        }, 
        () => onDataChange()
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'lead_pipeline'
        }, 
        () => onDataChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [pipelineId, user, onDataChange]);
}
