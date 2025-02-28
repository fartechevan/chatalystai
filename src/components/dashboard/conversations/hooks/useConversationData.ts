import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message, Lead } from "../types";
import { toast } from "sonner";
import { fetchConversationsWithParticipants, fetchMessages, fetchConversationSummary, sendMessage, fetchLeadByConversation } from "../api/conversationsApi";
import { transformConversationsData } from "../utils/conversationTransform";
import { useConversationSummary } from "./useConversationSummary";
import { supabase } from "@/integrations/supabase/client";

export function useConversationData(selectedConversation: Conversation | null) {
  const [newMessage, setNewMessage] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTimestamp, setSummaryTimestamp] = useState<string | null>(null);
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      console.log('Conversation changed, resetting state:', selectedConversation.conversation_id);
      // We don't reset leadData here - it will be updated by the query
    }
  }, [selectedConversation?.conversation_id]);

  useEffect(() => {
    console.log('Setting up global leads realtime subscription');
    const leadsChannel = supabase
      .channel('leads-global-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead table change detected:', payload);
          // When any lead changes, check if it's the one we're viewing
          if (leadData && payload.new && payload.new.id === leadData.id) {
            console.log('Current lead was updated, refetching data');
            // Force refetch the lead data
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversation?.conversation_id] 
            });
            
            // Also update the conversations list which may include lead info
            queryClient.invalidateQueries({ 
              queryKey: ['conversations'] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global leads subscription');
      supabase.removeChannel(leadsChannel);
    };
  }, [queryClient, leadData, selectedConversation?.conversation_id]);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { conversations, profiles, customers } = await fetchConversationsWithParticipants();
      return transformConversationsData(conversations, profiles, customers);
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.conversation_id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      console.log('Fetching messages for conversation:', selectedConversation.conversation_id);
      
      const messagesData = await fetchMessages(selectedConversation.conversation_id);
      const summaryData = await fetchConversationSummary(selectedConversation.conversation_id);

      if (summaryData) {
        setSummary(summaryData.summary);
        setSummaryTimestamp(summaryData.created_at);
      } else {
        setSummary(null);
        setSummaryTimestamp(null);
      }
      
      return messagesData;
    },
    enabled: !!selectedConversation,
  });

  const { data: fetchedLeadData } = useQuery({
    queryKey: ['lead', selectedConversation?.conversation_id],
    queryFn: async () => {
      if (!selectedConversation) return null;
      
      console.log('Fetching lead data for conversation:', selectedConversation.conversation_id);
      const lead = await fetchLeadByConversation(selectedConversation.conversation_id);
      
      console.log('Lead data retrieved:', lead);
      
      // Update our local state
      setLeadData(lead);
      
      return lead;
    },
    enabled: !!selectedConversation,
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (fetchedLeadData) {
      console.log('Lead data updated from query:', fetchedLeadData);
      setLeadData(fetchedLeadData);
    }
  }, [fetchedLeadData]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !selectedConversation) throw new Error('Not authenticated or no conversation selected');
      return sendMessage(selectedConversation.conversation_id, userData.user.id, content);
    },
    onSuccess: async () => {
      setNewMessage("");
      await refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success("Message sent successfully");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error('Error sending message:', error);
    }
  });

  const summarizeMutation = useConversationSummary(selectedConversation, messages, setSummary, setSummaryTimestamp);

  return {
    conversations,
    messages,
    isLoading,
    newMessage,
    setNewMessage,
    summary,
    summaryTimestamp,
    leadData,
    sendMessageMutation,
    summarizeMutation
  };
}
