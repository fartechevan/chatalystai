
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchConversationsWithParticipants, fetchConversationSummary } from "../api/conversationQueries";
import { 
  fetchMessages, 
  sendMessage, 
  sendWhatsAppMessage 
} from "../api/messageQueries";
import { useState } from "react"; // Removed useCallback, useEffect for now, will add back if needed for other logic
import type { Conversation, Message } from "../types";
import { useToast } from "@/components/ui/use-toast";

export function useConversationData(selectedConversation?: Conversation | null) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const pageSize = 30; // As requested

  // Helper to convert file to base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  
  // Fetch conversations list
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversationsWithParticipants
  });

  // Fetch messages for the selected conversation using useInfiniteQuery
  const messagesQuery = useInfiniteQuery({ // Let TypeScript infer generics
    queryKey: ['messages', selectedConversation?.conversation_id] as const, 
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => { // pageParam can be undefined initially if not using initialPageParam
      if (!selectedConversation?.conversation_id) return [] as Message[]; // Ensure return type is Message[]
      const messages = await fetchMessages(selectedConversation.conversation_id, pageParam, pageSize);
      return messages || ([] as Message[]); // Ensure return type is Message[]
    },
    initialPageParam: 1, // Start with page 1
    getNextPageParam: (lastPageData, allPagesData) => {
      console.log('getNextPageParam called: lastPageData.length:', lastPageData.length, 'pageSize:', pageSize, 'allPagesData.length:', allPagesData.length);
      // lastPageData is Message[]
      // allPagesData is Message[][]
      if (lastPageData.length === pageSize) {
        const nextPage = allPagesData.length + 1;
        console.log('Returning next page:', nextPage);
        return nextPage; // Next page number
      }
      console.log('No next page, returning undefined');
      return undefined; // No more pages
    },
    enabled: !!selectedConversation,
  });

  // Fetch conversation summary
  const summaryQuery = useQuery({
    queryKey: ['summary', selectedConversation?.conversation_id],
    queryFn: () => selectedConversation ? fetchConversationSummary(selectedConversation.conversation_id) : Promise.resolve(null),
    enabled: !!selectedConversation
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    // Update mutationFn to accept an object with message and optional file
    mutationFn: async (params: { chatId: string; message: string; file?: File }) => {
      if (!selectedConversation) return null;

      const { chatId, message: content, file } = params; // Destructure params
      
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
          // Ensure selectedConversation.integrations_id exists before trying to use it
          if (!selectedConversation.integrations_id) {
            console.error("sendMessageMutation: selectedConversation.integrations_id is missing.");
            throw new Error("Conversation is not properly linked to an integration (missing integrations_id).");
          }

          // Get instance_id from integrations_config table
          const { data: integrationConfigData, error: integrationConfigError } = await supabase
            .from('integrations_config') // TODO: Should this table name also change? Assuming not for now.
            .select('instance_id')
            .eq('integration_id', selectedConversation.integrations_id) // Assuming the column to match on integrations_config is integration_id
            .single();

          if (integrationConfigError) {
            console.error(`Error fetching integration config for integration_id ${selectedConversation.integrations_id}:`, integrationConfigError);
            throw new Error(`Failed to fetch integration configuration: ${integrationConfigError.message}`);
          }
          
          if (!integrationConfigData) {
            console.error(`No integration config found in 'integrations_config' for integration_id: ${selectedConversation.integrations_id}`);
            throw new Error("Integration configuration not found for this conversation.");
          }

          if (!integrationConfigData.instance_id) {
            console.error(`Integration config found for integration_id ${selectedConversation.integrations_id}, but 'instance_id' is missing:`, integrationConfigData);
            throw new Error("Instance ID is missing from the integration configuration.");
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

          // Send the message via WhatsApp
          const whatsappResult = await sendWhatsAppMessage(
            instanceId, // This is the Evolution Instance Name
            chatId, // This is the recipient JID (formerly customerPhoneNumber)
            content,
            selectedConversation.integrations_id, // This is the DB integration_config.integration_id
            file // Pass the file
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

          toast({
            title: "Message sent",
            description: "Your message was successfully sent via WhatsApp",
          });

          // If a file was sent, optimistically insert it into our DB with its base64 content
          // This ensures it appears in the UI immediately via the query invalidation.
          // The webhook will later receive this message and should ideally upsert based on wamid.
          if (file && whatsappResult.data?.messageId) {
            const base64ImageContent = await toBase64(file);
            const messageToInsert = {
              wamid: whatsappResult.data.messageId,
              conversation_id: selectedConversation.conversation_id,
              content: base64ImageContent, // Store the base64 data URI
              sender_participant_id: adminParticipantId,
              is_read: true, // Outgoing messages are "read" by the sender
              created_at: new Date().toISOString(),
              // message_id will be auto-generated by DB or can be a UUID
            };
            console.log("Attempting to insert outgoing image message to DB:", messageToInsert);
            const { error: dbInsertError } = await supabase
              .from("messages")
              .insert(messageToInsert);

            if (dbInsertError) {
              console.error("Failed to insert outgoing image message to DB:", dbInsertError);
              // Optionally notify user, but primary send was successful
              toast({
                title: "Local Save Issue",
                description: "Message sent via WhatsApp, but failed to save a local copy immediately.",
                variant: "destructive",
              });
            } else {
              console.log("Successfully inserted outgoing image message to DB.");
            }
          } else if (file && !whatsappResult.data?.messageId) {
            console.warn("WhatsApp send reported success, but no messageId (wamid) returned. Cannot save local image copy with wamid.");
          }

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
        // When a new message is sent, we want to refetch from the first page
        // to ensure the new message is displayed correctly at the top (or bottom, depending on UI).
        // Since we sort by created_at desc, new messages appear on page 1.
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

  // Combine all pages of messages from useInfiniteQuery
  // The actual data structure for useInfiniteQuery is { pages: Message[][], pageParams: number[] }
  const allMessages = messagesQuery.data?.pages?.flatMap(page => page) || [];

  return {
    conversations: conversationsQuery.data?.conversations || [],
    messages: allMessages, // Use the flattened array of all messages
    isLoading: conversationsQuery.isLoading || messagesQuery.isLoading,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
    error: conversationsQuery.error || messagesQuery.error,
    newMessage,
    setNewMessage,
    summary: summaryQuery.data?.summary || null,
    summaryTimestamp: summaryQuery.data?.created_at || null,
    sendMessageMutation,
    summarizeMutation
  };
}
