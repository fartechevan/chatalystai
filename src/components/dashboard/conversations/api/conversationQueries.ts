
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../types";

/**
 * Fetches conversations the current user has access to, with their associated leads
 */
export async function fetchConversationsWithParticipants() {
  console.log("Fetching conversations with participants for current user...");

  // 1. Get current user ID
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or user not logged in:", userError);
    // Return empty list if no user, preventing unauthorized data fetch
    return { conversations: [], profiles: [], customers: [] }; 
  }
  const userId = user.id;
  console.log(`Current user ID: ${userId}`);

  // 2. Fetch accessible integration_ids for the user
  const { data: accessData, error: accessError } = await supabase
    .from('profile_integration_access')
    .select('integration_id') // Selecting the correct column
    .eq('profile_id', userId);

  if (accessError) {
    console.error("Error fetching user access rights:", accessError);
    throw accessError; // Rethrow to be caught by react-query
  }
  // Use the fetched integration_ids directly
  const accessibleIntegrationIds = accessData?.map(item => item.integration_id) || []; 
  console.log(`User has access to integration IDs: ${accessibleIntegrationIds.join(', ') || 'None'}`);

  // Step 3 (fetching integration_ids from integrations_config) is removed as it's redundant.

  // 4. Build the filter for the conversations query using the directly fetched integration IDs
  // Allow conversations where integrations_id is null OR integrations_id is in the accessible list
  const integrationFilter = accessibleIntegrationIds.length > 0
    ? `integrations_id.is.null,integrations_id.in.(${accessibleIntegrationIds.map(id => `"${id}"`).join(',')})`
    : 'integrations_id.is.null'; // If user has no access, only show internal chats

  console.log(`Applying conversation filter: ${integrationFilter}`);

  // 5. Define the query builder using const
  const query = supabase
    .from("conversations")
    .select(
      `
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
      )
    `
    )
    .or(integrationFilter) // Apply the OR filter here
    .order("updated_at", { ascending: false });

  // Execute the query
  const { data: conversations, error: conversationsError } = await query;

  if (conversationsError) {
    console.error("Error fetching conversations:", conversationsError);
    throw conversationsError;
  }

  console.log(`Fetched ${conversations?.length || 0} conversations matching access criteria.`);

  // Return early if no conversations are found or accessible
  if (!conversations || conversations.length === 0) {
    return { conversations: [], profiles: [], customers: [] };
  }

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
