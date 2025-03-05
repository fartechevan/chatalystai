
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
    console.log(`Sending WhatsApp message via edge function. ConfigId: ${configId}, Recipient: ${recipient}`);
    
    const response = await supabase.functions.invoke('integrations', {
      body: {
        configId,
        number: recipient.split('@')[0], // Extract phone number from recipient (e.g., "1234567890@c.us")
        text: message
      }
    });

    console.log('WhatsApp API response:', response);

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
