
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppMessageRequest, WhatsAppMessageResponse } from "./types";

/**
 * Sends a WhatsApp message through the integrations edge function
 */
export async function sendWhatsAppMessage(
  instanceId: string,
  recipient: string, 
  message: string
): Promise<WhatsAppMessageResponse> {
  try {
    console.log(`Sending WhatsApp message via edge function. InstanceId: ${instanceId}, Recipient: ${recipient}`);

    // Extract phone number without the @c.us suffix if present
    const phoneNumber = recipient.includes('@') ? recipient.split('@')[0] : recipient;

    console.log('Phone number being sent to edge function:', phoneNumber);
    
    const payload: WhatsAppMessageRequest = {
      number: phoneNumber,
      text: message,
      instanceId: instanceId
    };
    
    console.log('WhatsApp API request payload:', payload);
    
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
      data: response.data
    };
  } catch (error) {
    console.error('Error invoking edge function:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
