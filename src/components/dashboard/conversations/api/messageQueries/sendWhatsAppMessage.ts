
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppMessageRequest, WhatsAppMessageResponse } from "./types";

/**
 * Sends a WhatsApp message through the integrations edge function
 */
export async function sendWhatsAppMessage(
  instanceId: string,
  recipient: string,
  message: string,
  integrationsConfigId: string
): Promise<WhatsAppMessageResponse> {
  try {
    console.log(`Sending WhatsApp message via edge function. InstanceId: ${instanceId}, Recipient: ${recipient}, integrationsConfigId: ${integrationsConfigId}`);

    // Extract phone number without the @c.us suffix if present
    const phoneNumber = recipient.includes('@') ? recipient.split('@')[0] : recipient;

    console.log('Phone number being sent to edge function:', phoneNumber);
    
    const payload: WhatsAppMessageRequest = {
      number: phoneNumber,
      text: message,
      instanceId: instanceId
    };
    
    console.log('WhatsApp API request payload:', payload);
    
    const { data, error } = await supabase.functions.invoke('integrations', {
      body: payload
    });

    console.log('WhatsApp API response:', data, error);

    if (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }

    return {
      success: true,
      data: data
    };
  } catch (error: any) {
    console.error('Error invoking edge function:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
