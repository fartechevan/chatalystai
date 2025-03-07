
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLeadsRealtime } from "./useLeadsRealtime";

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  user_id: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  pipeline_id: string;
}

export interface Lead {
  id: string;
  value: number;
  customer_id: string;
  pipeline_stage_id: string;
  user_id: string;
  name?: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export function usePipelineData(pipelineId: string | null) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Set up realtime subscription
  useLeadsRealtime(pipelineId, refreshPipelineData);

  async function fetchPipelineData() {
    if (!pipelineId || !user) return;
    
    setLoading(true);
    try {
      // Fetch pipeline info
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('user_id', user.id)
        .single();

      if (pipelineError) {
        throw pipelineError;
      }

      setPipeline(pipelineData);

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (stagesError) {
        throw stagesError;
      }

      setStages(stagesData || []);

      // Fetch leads for this pipeline with customer information
      if (stagesData && stagesData.length > 0) {
        const stageIds = stagesData.map(stage => stage.id);
        
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select(`
            *,
            customers:customers (
              name,
              company_name,
              email,
              phone_number
            )
          `)
          .in('pipeline_stage_id', stageIds);
        
        if (leadsError) {
          throw leadsError;
        }

        // Transform data to include customer information directly in leads
        const transformedLeads = (leadsData || []).map(lead => ({
          id: lead.id,
          value: lead.value || 0,
          customer_id: lead.customer_id,
          pipeline_stage_id: lead.pipeline_stage_id,
          user_id: lead.user_id,
          name: lead.customers?.name,
          company_name: lead.customers?.company_name,
          contact_email: lead.customers?.email,
          contact_phone: lead.customers?.phone_number
        }));

        setLeads(transformedLeads);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      toast({
        title: "Error",
        description: "Failed to load pipeline data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function refreshPipelineData() {
    fetchPipelineData();
  }

  useEffect(() => {
    if (pipelineId) {
      fetchPipelineData();
    } else {
      setPipeline(null);
      setStages([]);
      setLeads([]);
      setLoading(false);
    }
  }, [pipelineId, user]);

  return {
    pipeline,
    stages,
    leads,
    loading,
    refreshPipelineData
  };
}
