
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "../../types";

/**
 * Fetches messages for a specific conversation
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*, sender_participant:sender_participant_id(id, role, external_user_identifier)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return messagesData;
}
