
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "../../types";

/**
 * Sends a new message in a conversation
 */
export async function sendMessage(
  conversationId: string, 
  participantId: string, 
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_participant_id: participantId,
      content
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
