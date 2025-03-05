
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppMessageRequest, WhatsAppMessageResponse } from "./types";

/**
 * Sends a WhatsApp message through the integrations edge function
 */
export async function sendWhatsAppMessage(
  configId: string, 
  recipient: string, 
  message: string
): Promise<WhatsAppMessageResponse> {
  try {
    console.log(`Sending WhatsApp message via edge function. ConfigId: ${configId}, Recipient: ${recipient}`);
    
    const payload: WhatsAppMessageRequest = {
      configId,
      number: recipient.split('@')[0], // Extract phone number from recipient (e.g., "1234567890@c.us")
      text: message
    };
    
    const response = await supabase.functions.invoke('integrations', {
      body: payload
    });

    console.log('WhatsApp API response:', response);

    if (response.error) {
      console.error('Error sending WhatsApp message:', response.error);
      throw new Error(response.error.message || 'Failed to send WhatsApp message');
    }

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    console.error('Error invoking edge function:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
