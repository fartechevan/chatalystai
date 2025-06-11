
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "../../types"; // Adjusted path

/**
 * Fetches messages for a specific conversation
 */
export async function fetchMessages(
  conversationId: string, 
  page: number = 1, 
  pageSize: number = 30
): Promise<Message[] | null> { // Explicit return type
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      message_id,
      conversation_id,
      content,
      is_read,
      created_at,
      sender_participant_id,
      wamid,
      media_type,
      media_data,
      sender:sender_participant_id (
        id,
        role,
        external_user_identifier,
        customer_id
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching messages:', error);
     throw error;
   }
 
   return data as Message[] | null; // Cast to ensure type conformity
 }
