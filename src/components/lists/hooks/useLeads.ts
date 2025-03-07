
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/components/dashboard/conversations/types";
import { useToast } from "@/hooks/use-toast";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          value,
          created_at,
          updated_at,
          user_id,
          customer_id,
          pipeline_stage_id,
          customers:customers (
            name,
            company_name,
            phone_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform data to match Lead type
      const transformedLeads: Lead[] = data.map(lead => ({
        id: lead.id,
        value: lead.value || 0,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        user_id: lead.user_id,
        customer_id: lead.customer_id || '',
        pipeline_stage_id: lead.pipeline_stage_id || '',
        name: lead.customers?.name,
        company_name: lead.customers?.company_name,
        contact_email: lead.customers?.email,
        contact_phone: lead.customers?.phone_number
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    loading,
    refreshLeads: fetchLeads
  };
}
