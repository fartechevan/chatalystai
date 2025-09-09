
import { supabase } from "../../../../integrations/supabase/client.ts";
import type { Conversation } from "../types";

/**
 * Fetches conversations the current user has access to, with their associated leads
 */
export async function fetchConversationsWithParticipants(selectedIntegrationIds: string[]) {
  // 1. Get current user ID
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or user not logged in:", userError);
    return { conversations: [], profiles: [], customers: [] };
  }

  // 5. Define the query builder with subquery for latest message timestamp
  let query = supabase
    .from("conversations")
    .select(`
      conversation_id,
      created_at,
      updated_at,
      lead_id,
      integrations_id,
      lead:lead_id(
        id,
        customer_id,
        value,
        user_id,
        created_at,
        updated_at,
        pipeline_stage_id
      ),
      messages!inner(
        created_at
      )
    `)
    .order("updated_at", { ascending: false })
    .limit(1, { foreignTable: 'messages' }); // Get only the latest message per conversation

  if (selectedIntegrationIds.length > 0) {
    query = query.in("integrations_id", selectedIntegrationIds);
  }

  // Execute the query
  // Alternative approach using raw SQL for better performance
  const { data: conversations, error: conversationsError } = await supabase.rpc('get_conversations_by_last_message', {
    selected_integration_ids: selectedIntegrationIds
  });

  if (conversationsError) {
    console.error("Error fetching conversations:", conversationsError);
    throw conversationsError;
  }

  // Return early if no conversations are found
  if (!conversations || conversations.length === 0) {
    return { conversations: [], profiles: [], customers: [] };
  }

  // Sort conversations by their latest message timestamp
  const sortedConversations = conversations.sort((a, b) => {
    const aLatestMessage = a.messages?.[0]?.created_at;
    const bLatestMessage = b.messages?.[0]?.created_at;
    
    // Handle conversations without messages (put them at the end)
    if (!aLatestMessage && !bLatestMessage) return 0;
    if (!aLatestMessage) return 1;
    if (!bLatestMessage) return -1;
    
    return new Date(bLatestMessage).getTime() - new Date(aLatestMessage).getTime();
  });

  // Fetch participants for each conversation
  const conversationsWithParticipants = await Promise.all(
    conversations.map(async (conv) => {
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("id, conversation_id, role, external_user_identifier, customer_id")
        .eq("conversation_id", conv.conversation_id);

      if (participantsError) {
        console.error(`Error fetching participants for conversation ${conv.conversation_id}:`, participantsError);
        return {
          ...conv,
          participants: [],
        };
      }

      // If the conversation has a lead with customer_id, fetch customer data
      let customer = null;
      if (conv.lead?.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, name, phone_number')
          .eq('id', conv.lead.customer_id)
          .maybeSingle();
        
        if (!customerError && customerData) {
          customer = customerData;
        }
      }

      return {
        ...conv,
        participants,
        // Add customer directly to the conversation object
        customer: customer,
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
