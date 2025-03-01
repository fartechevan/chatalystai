
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message, Lead } from "../types";
import { toast } from "sonner";
import { 
  fetchConversationsWithParticipants, 
  fetchMessages, 
  fetchConversationSummary, 
  sendMessage, 
  getParticipantId 
} from "../api/services/conversationService";
import { transformConversationsData } from "../utils/conversationTransform";
import { useConversationSummary } from "./useConversationSummary";
import { supabase } from "@/integrations/supabase/client";

export function useConversationData(selectedConversation: Conversation | null) {
  const [newMessage, setNewMessage] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTimestamp, setSummaryTimestamp] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      console.log('Conversation changed, resetting state:', selectedConversation.conversation_id);
    }
  }, [selectedConversation?.conversation_id]);

  // Set up global leads subscription for real-time updates
  useEffect(() => {
    console.log('Setting up global leads and pipeline subscriptions');
    
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
          if (selectedConversation?.lead_id && 
              payload.new && typeof payload.new === 'object' && 
              'id' in payload.new && payload.new.id === selectedConversation.lead_id) {
            
            console.log('Current lead was updated, refetching data');
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversation.conversation_id] 
            });
            
            queryClient.invalidateQueries({ 
              queryKey: ['conversations'] 
            });
          }
        }
      )
      .subscribe();

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
          if (selectedConversation?.lead_id && 
              payload.new && typeof payload.new === 'object' && 
              'lead_id' in payload.new && payload.new.lead_id === selectedConversation.lead_id) {
            
            console.log('Current lead pipeline was updated, refetching data');
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversation.conversation_id] 
            });
            
            queryClient.invalidateQueries({ 
              queryKey: ['conversations'] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global subscriptions');
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(leadPipelineChannel);
    };
  }, [queryClient, selectedConversation]);

  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { conversations, profiles, customers } = await fetchConversationsWithParticipants();
      return transformConversationsData(conversations, profiles, customers);
    },
  });

  // Fetch messages for the selected conversation
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

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !selectedConversation) throw new Error('Not authenticated or no conversation selected');
      
      const participantId = await getParticipantId(selectedConversation.conversation_id, userData.user.id);
      if (!participantId) throw new Error('Participant not found');
      
      return sendMessage(selectedConversation.conversation_id, participantId, content);
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

  // Helper function to get participant ID
  const getParticipantId = async (conversationId: string, userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error getting participant ID:', error);
      return null;
    }
  };

  // Use the conversation summary hook
  const summarizeMutation = useConversationSummary(selectedConversation, messages, setSummary, setSummaryTimestamp);

  return {
    conversations,
    messages,
    isLoading,
    newMessage,
    setNewMessage,
    summary,
    summaryTimestamp,
    sendMessageMutation,
    summarizeMutation
  };
}
