
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
      if (selectedConversation.integrations_id) {
        try {
          // Get instance_id from integrations_config table
          const { data: integrationConfigData, error: integrationConfigError } = await supabase
            .from('integrations_config') // TODO: Should this table name also change? Assuming not for now.
            .select('instance_id')
            .eq('integration_id', selectedConversation.integrations_id) // Assuming the column to match on integrations_config is integration_id
            .single();

          if (integrationConfigError || !integrationConfigData?.instance_id) {
            console.error("Integration config not found or missing instance_id:", integrationConfigError);
            throw new Error("Could not find instance_id");
          }

          const instanceId = integrationConfigData.instance_id;

          let customerPhoneNumber: string | undefined;

          if (selectedConversation.lead?.customer_id) {
            // Get customer data from customers table using lead's customer_id
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .select('phone_number')
              .eq('id', selectedConversation.lead.customer_id)
              .single();

            if (customerError || !customerData?.phone_number) {
              console.error("Customer not found or missing phone number:", customerError);
              throw new Error("Could not find recipient's phone number");
            }

            customerPhoneNumber = customerData.phone_number;
          } else {
            // If no lead, try to get phone number from conversation participants
            const customerParticipant = selectedConversation.participants?.find(p => p.role !== 'admin' && p.external_user_identifier);
            if (customerParticipant?.external_user_identifier) {
              customerPhoneNumber = customerParticipant.external_user_identifier;
            } else {
              console.error("Could not find customer participant with phone number");
              throw new Error("Could not find recipient's phone number");
            }
          }

          if (!customerPhoneNumber) {
            console.error("Could not find recipient's phone number");
            throw new Error("Could not find recipient's phone number");
          }

          console.log("Sending WhatsApp message with:", {
            instanceId,
            customerPhoneNumber,
            content,
            integrationId: selectedConversation.integrations_id // Renamed property for clarity
          });

          // Send the message via WhatsApp
          const whatsappResult = await sendWhatsAppMessage(
            instanceId,
            customerPhoneNumber,
            content,
            selectedConversation.integrations_id
          );

          console.log("WhatsApp result:", whatsappResult);

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

      // If it's NOT a WhatsApp conversation, save the message to our database directly.
      // If it WAS a WhatsApp conversation, the webhook handler is responsible for saving.
      if (!selectedConversation.integrations_id) {
        const result = await sendMessage(
          selectedConversation.conversation_id,
          adminParticipantId,
          content
        );
        return result;
      } else {
        // For WhatsApp, return a simple success indicator or null,
        // as the actual message data comes from the webhook upsert.
        return { success: true }; // Indicate the API call part was successful
      }
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
