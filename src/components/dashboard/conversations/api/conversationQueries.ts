
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../types";

/**
 * Fetches all conversations with their associated leads
 */
export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations with participants...');

  // First, get all conversations with their associated leads
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*, lead:lead_id(*), integrations_config_id, participants:conversation_participants(*, profiles(*))')
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError);
    throw conversationsError;
  }

  console.log('Fetched conversations:', conversations);

  // Transform the data
  const transformedData = conversations.map(conv => {
    console.log('Raw conversation object:', conv);
    return {
      conversation_id: conv.conversation_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      lead_id: conv.lead_id,
      lead: conv.lead,
      integrations_config_id: conv.integrations_config_id,
      participants: conv.participants
    };
  });

  return {
    conversations: transformedData,
    profiles: [],
    customers: []
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
      .from('conversation_summaries')
      .select('summary, created_at')
      .eq('conversation_id', conversationId)
      .maybeSingle();

  return summaryData;
}
