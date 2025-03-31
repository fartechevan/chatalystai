
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
      instanceId: instanceId,
      number: phoneNumber,
      text: message
    };
    
    console.log('WhatsApp API request payload:', payload);
    
    // TODO: Replace with local whatsapp/services function (e.g., sendTextService)
    // const { data, error } = await supabase.functions.invoke('integrations/message/sendText', {
    //   body: payload
    // });
    const data: unknown = null; const error = new Error("Supabase function call commented out."); // Placeholder

    console.log('WhatsApp API response:', data, error);

    if (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }

    return {
      success: true,
      data: data
    };
  } catch (error: unknown) {
    console.error('Error invoking edge function:', error);
    // Check if error is an instance of Error to safely access message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}
