
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConversationsWithParticipants, fetchConversationSummary } from "../api/conversationQueries";
import { fetchMessages, sendMessage, sendWhatsAppMessage } from "../api/messageQueries";
import { useState } from "react";
import type { Conversation, Message } from "../types";

export function useConversationData(selectedConversation?: Conversation | null) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  
  // Fetch conversations list
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversationsWithParticipants
  });

  // Fetch messages for the selected conversation
  const messagesQuery = useQuery({
    queryKey: ['messages', selectedConversation?.conversation_id],
    queryFn: () => selectedConversation ? fetchMessages(selectedConversation.conversation_id) : Promise.resolve([]),
    enabled: !!selectedConversation
  });

  // Fetch conversation summary
  const summaryQuery = useQuery({
    queryKey: ['summary', selectedConversation?.conversation_id],
    queryFn: () => selectedConversation ? fetchConversationSummary(selectedConversation.conversation_id) : Promise.resolve(null),
    enabled: !!selectedConversation
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) return null;
      
      // Find admin participant ID from the participants list
      const adminParticipantId = selectedConversation.participants?.find(
        p => p.role === 'admin'
      )?.id;
      
      if (!adminParticipantId) {
        throw new Error("Could not find admin participant ID");
      }
      
      // First, send message to our database
      const result = await sendMessage(
        selectedConversation.conversation_id,
        adminParticipantId,
        content
      );
      
      // If this conversation is linked to a WhatsApp integration, also send via WhatsApp
      if (selectedConversation.integrations_config_id) {
        try {
          console.log("Sending WhatsApp message for conversation with config ID:", selectedConversation.integrations_config_id);
          
          // Find member participant to get their WhatsApp number
          const memberParticipant = selectedConversation.participants?.find(
            p => p.role === 'member'
          );
          
          if (memberParticipant?.external_user_identifier) {
            await sendWhatsAppMessage(
              selectedConversation.integrations_config_id,
              memberParticipant.external_user_identifier,
              content
            );
            console.log("WhatsApp message sent successfully");
          } else {
            console.error("Member participant not found or missing external identifier");
          }
        } catch (err) {
          console.error('Failed to send WhatsApp message:', err);
          // We don't throw here - the message was already saved to our database
        }
      }
      
      setNewMessage("");
      return result;
    },
    onSuccess: () => {
      // Invalidate the messages query to refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.conversation_id] });
    }
  });

  // Summarize conversation mutation
  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) return null;
      // Implement summarize functionality if needed
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary', selectedConversation?.conversation_id] });
    }
  });

  return {
    conversations: conversationsQuery.data?.conversations || [],
    messages: messagesQuery.data || [],
    isLoading: conversationsQuery.isLoading || messagesQuery.isLoading,
    error: conversationsQuery.error || messagesQuery.error,
    newMessage,
    setNewMessage,
    summary: summaryQuery.data?.summary || null,
    summaryTimestamp: summaryQuery.data?.created_at || null,
    sendMessageMutation,
    summarizeMutation
  };
}
