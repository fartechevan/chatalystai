
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches messages for a specific conversation
 */
export async function fetchMessages(conversationId: string) {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return messagesData;
}

/**
 * Sends a new message in a conversation
 */
export async function sendMessage(conversationId: string, participantId: string, content: string) {
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

/**
 * Sends a WhatsApp message through the integrations edge function
 */
export async function sendWhatsAppMessage(configId: string, recipient: string, message: string) {
  try {
    const response = await supabase.functions.invoke('integrations', {
      body: {
        action: 'send_message',
        configId,
        data: {
          recipient,
          message
        }
      }
    });

    if (response.error) {
      console.error('Error sending WhatsApp message:', response.error);
      throw new Error(response.error.message || 'Failed to send WhatsApp message');
    }

    return response.data;
  } catch (error) {
    console.error('Error invoking edge function:', error);
    throw error;
  }
}
