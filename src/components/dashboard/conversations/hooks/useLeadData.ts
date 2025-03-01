
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Lead } from "../types";

export function useLeadData(selectedConversation: Conversation | null) {
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeadData = async () => {
    if (!selectedConversation) {
      setLeadData(null);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching lead data for conversation:', selectedConversation.conversation_id);
      
      // 1. First get the lead_id
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('lead_id')
        .eq('conversation_id', selectedConversation.conversation_id)
        .single();

      if (conversationError) {
        console.error('Error fetching lead_id:', conversationError);
        setLeadData(null);
        return;
      }

      if (!conversationData?.lead_id) {
        console.log('No lead associated with this conversation');
        setLeadData(null);
        return;
      }

      // 2. Fetch the lead data with all necessary details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', conversationData.lead_id)
        .single();

      if (leadError) {
        console.error('Error fetching lead details:', leadError);
        setLeadData(null);
        return;
      }

      setLeadData(lead);
    } catch (error) {
      console.error('Error in fetchLeadData:', error);
      setLeadData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup real-time subscription for lead changes
  useEffect(() => {
    console.log('Setting up real-time lead subscription');
    
    const leadsChannel = supabase
      .channel('leads-changes-hook')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead change detected:', payload);
          if (leadData && payload.new && typeof payload.new === 'object' && 
              'id' in payload.new && payload.new.id === leadData.id) {
            console.log('Our lead changed, refetching');
            fetchLeadData();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time lead subscription');
      supabase.removeChannel(leadsChannel);
    };
  }, [leadData]);

  // Fetch lead data when conversation changes
  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      console.log('Conversation changed, fetching new lead data');
      setLeadData(null); // Clear previous data
      fetchLeadData();
    }
  }, [selectedConversation?.conversation_id]);

  return { 
    leadData, 
    isLoading, 
    refetchLeadData: fetchLeadData 
  };
}
