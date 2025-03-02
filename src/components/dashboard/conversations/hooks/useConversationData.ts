
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConversationsWithParticipants, fetchConversationSummary } from "../api/conversationQueries";
import { fetchMessages, sendMessage } from "../api/messageQueries";
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
      
      const result = await sendMessage(
        selectedConversation.conversation_id,
        adminParticipantId,
        content
      );
      
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
