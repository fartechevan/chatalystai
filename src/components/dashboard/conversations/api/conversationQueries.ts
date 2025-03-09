
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../types";

/**
 * Fetches all conversations with their associated leads
 */
export async function fetchConversationsWithParticipants() {
  console.log("Fetching conversations with participants...");

  // First, get all conversations with their associated leads
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select(
      `
      conversation_id,
      created_at,
      updated_at,
      lead_id,
      integrations_config_id,
      lead:lead_id(*),
      customer:conversation_participants(
        customer:customer_id(id, name)
      )
    `
    )
    .order("updated_at", { ascending: false });

  if (conversationsError) {
    console.error("Error fetching conversations:", conversationsError);
    throw conversationsError;
  }

  console.log("Fetched conversations:", JSON.stringify(conversations, null, 2));

  // Fetch participants for each conversation
  const conversationsWithParticipants = await Promise.all(
    conversations.map(async (conv) => {
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("id, conversation_id, role, external_user_identifier, customer_id")
        .eq("conversation_id", conv.conversation_id); // Using conversation_id instead of id

      if (participantsError) {
        console.error(`Error fetching participants for conversation ${conv.conversation_id}:`, participantsError);
        return {
          ...conv,
          participants: [],
        };
      }

      return {
        ...conv,
        participants: participants.map((participant) => {
          const customer =
            Array.isArray(conv.customer) && conv.customer.length > 0
              ? conv.customer.find((c) => c?.customer?.id === participant.customer_id)?.customer
              : null;

          return {
            ...participant,
            customer: customer || null,
            customer_id: undefined, // Remove customer_id as it's now inside the customer object
          };
        }),
      };
    })
  );

  return {
    conversations: conversationsWithParticipants,
    profiles: [],
    customers: [],
  };
}

/**
 * For backwards compatibility
 */
export const fetchConversations = fetchConversationsWithParticipants;

/**
 * Fetches a conversation summary
 */
export async function fetchConversationSummary(conversationId: string) {
  const { data: summaryData } = await supabase
    .from("conversation_summaries")
    .select("summary, created_at")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return summaryData;
}
