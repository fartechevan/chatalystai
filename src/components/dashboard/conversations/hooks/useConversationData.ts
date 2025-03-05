import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConversationsWithParticipants, fetchConversationSummary } from "../api/conversationQueries";
import { 
  fetchMessages, 
  sendMessage, 
  sendWhatsAppMessage 
} from "../api/messageQueries";
import { useState } from "react";
import type { Conversation, Message } from "../types";
import { useToast } from "@/components/ui/use-toast";

export function useConversationData(selectedConversation?: Conversation | null) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  
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
      
      // If this conversation is linked to a WhatsApp integration, first send via WhatsApp
      if (selectedConversation.integrations_config_id) {
        try {
          console.log("Sending WhatsApp message for conversation with config ID:", selectedConversation.integrations_config_id);
          // Get customer data from customers table
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('phone_number')
            .eq('id', selectedConversation.lead?.customer_id)
            .single();

          if (customerError || !customerData?.phone_number) {
            console.error("Customer not found or missing phone number");
            throw new Error("Could not find recipient's phone number");
          }

          // Send the message via WhatsApp
          const whatsappResult = await sendWhatsAppMessage(
            selectedConversation.integrations_config_id,
            customerData.phone_number,
            content
          );

          // If WhatsApp message fails, show error and don't save to database
          if (!whatsappResult.success) {
            console.error('Failed to send WhatsApp message:', whatsappResult.error);
            toast({
              title: "WhatsApp message failed",
              description: whatsappResult.error || "Could not send WhatsApp message",
              variant: "destructive"
            });
            return null;
          }

          console.log("WhatsApp message sent successfully:", whatsappResult);
          toast({
            title: "Message sent",
            description: "Your message was successfully sent via WhatsApp",
          });
        } catch (err) {
          console.error('Failed to send WhatsApp message:', err);
          toast({
            title: "WhatsApp message failed",
            description: err.message || "An error occurred sending the WhatsApp message",
            variant: "destructive"
          });
          return null;
        }
      }

      // If WhatsApp message was successful or not a WhatsApp conversation,
      // save the message to our database
      const result = await sendMessage(
        selectedConversation.conversation_id,
        adminParticipantId,
        content
      );

      setNewMessage("");
      return result;
    },
    onSuccess: (data) => {
      if (data) {
        // Invalidate the messages query to refetch messages
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.conversation_id] });
      }
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
