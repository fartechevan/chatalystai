
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches messages for a specific conversation
 */
export async function fetchMessages(conversationId: string) {
  console.log('Fetching messages for conversation:', conversationId);
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_participant_id (
        id,
        role,
        external_user_identifier,
        customer_id
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at');

  if (error) {
    console.error('Error fetching messages:', error);
     throw error;
   }
 
   // console.log('Fetched messages:', data); // Removed log
   return data;
 }
