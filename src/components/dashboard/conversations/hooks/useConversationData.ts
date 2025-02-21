
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message, Profile } from "../types";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string | null;
  email: string;
}

export function useConversationData(selectedConversation: Conversation | null) {
  const [newMessage, setNewMessage] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTimestamp, setSummaryTimestamp] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...');
      
      // First get the conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      // Then fetch all profiles and customers that we need
      const uniqueProfileIds = new Set<string>();
      const uniqueCustomerIds = new Set<string>();

      conversationsData.forEach(conv => {
        if (conv.sender_type === 'profile') uniqueProfileIds.add(conv.sender_id);
        if (conv.receiver_type === 'profile') uniqueProfileIds.add(conv.receiver_id);
        if (conv.sender_type === 'customer') uniqueCustomerIds.add(conv.sender_id);
        if (conv.receiver_type === 'customer') uniqueCustomerIds.add(conv.receiver_id);
      });

      // Fetch profiles
      const { data: profiles = [] } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', Array.from(uniqueProfileIds));

      // Fetch customers
      const { data: customers = [] } = await supabase
        .from('customers')
        .select('id, name, email')
        .in('id', Array.from(uniqueCustomerIds));

      // Create lookup maps
      const profilesMap = new Map(profiles.map(p => [p.id, p]));
      const customersMap = new Map(customers.map(c => [c.id, c]));

      // Transform the data
      const transformedData = conversationsData.map(conv => {
        const sender = conv.sender_type === 'profile' 
          ? profilesMap.get(conv.sender_id)
          : customersMap.get(conv.sender_id);
          
        const receiver = conv.receiver_type === 'profile'
          ? profilesMap.get(conv.receiver_id)
          : customersMap.get(conv.receiver_id);

        return {
          conversation_id: conv.conversation_id,
          sender_id: conv.sender_id,
          receiver_id: conv.receiver_id,
          sender_type: conv.sender_type,
          receiver_type: conv.receiver_type,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          sender: sender ? {
            id: sender.id,
            name: sender.name,
            email: sender.email
          } : null,
          receiver: receiver ? {
            id: receiver.id,
            name: receiver.name,
            email: receiver.email
          } : null
        } as Conversation;
      });

      console.log('Transformed conversations:', transformedData);
      return transformedData;
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.conversation_id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      console.log('Fetching messages for conversation:', selectedConversation.conversation_id);
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.conversation_id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      // Fetch existing summary
      const { data: summaryData } = await supabase
        .from('conversation_summaries')
        .select('summary, created_at')
        .eq('conversation_id', selectedConversation.conversation_id)
        .maybeSingle();

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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !selectedConversation) throw new Error('Not authenticated or no conversation selected');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.conversation_id,
          sender_id: userData.user.id,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
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

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || messages.length === 0) return null;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const messagesWithConversation = messages.map(msg => ({
        ...msg,
        conversation: selectedConversation
      }));

      console.log('Calling summarize-conversation function...');
      const { data, error } = await supabase.functions.invoke('summarize-conversation', {
        body: { messages: messagesWithConversation }
      });

      if (error) throw error;

      // Store the summary in the database
      if (data.summary) {
        console.log('Saving summary to database...');
        const { data: summaryData, error: summaryError } = await supabase
          .from('conversation_summaries')
          .upsert({
            conversation_id: selectedConversation.conversation_id,
            summary: data.summary,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (summaryError) {
          console.error('Error saving summary:', summaryError);
          throw summaryError;
        }

        // Log token usage
        const { error: tokenError } = await supabase
          .from('token_usage')
          .insert({
            user_id: user.id,
            conversation_id: selectedConversation.conversation_id,
            tokens_used: 1
          });

        if (tokenError) {
          console.error('Error logging token usage:', tokenError);
          throw tokenError;
        }

        console.log('Summary saved successfully:', summaryData);
        console.log('Token usage logged successfully');
        return summaryData;
      }

      return null;
    },
    onSuccess: (data) => {
      if (data) {
        setSummary(data.summary);
        setSummaryTimestamp(data.created_at);
        toast.success("Conversation summarized");
      }
    },
    onError: (error) => {
      toast.error("Failed to summarize conversation");
      console.error("Summarization error:", error);
    }
  });

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
