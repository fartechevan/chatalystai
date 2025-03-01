
import { supabase } from "@/integrations/supabase/client";

/**
 * Gets the participant ID for a user in a conversation
 * This is used when sending messages
 */
export async function getParticipantId(conversationId: string, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error getting participant ID:', error);
    return null;
  }
}
