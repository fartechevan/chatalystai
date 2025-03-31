
import { supabase } from "@/integrations/supabase/client";
import { sendTextMessage } from "@/components/settings/integration-dialog/hooks/whatsapp/services/sendTextService";
import type { WhatsAppMessageRequest, WhatsAppMessageResponse } from "./types";

/**
 * Sends a WhatsApp message through the Evolution API
 */
export async function sendWhatsAppMessage(
  instanceId: string,
  recipient: string,
  message: string,
  integrationsConfigId: string
): Promise<WhatsAppMessageResponse> {
  try {
    console.log(`Sending WhatsApp message. InstanceId: ${instanceId}, Recipient: ${recipient}, integrationsConfigId: ${integrationsConfigId}`);

    // Extract phone number without the @c.us suffix if present
    const phoneNumber = recipient.includes('@') ? recipient.split('@')[0] : recipient;
    console.log('Phone number being sent to service:', phoneNumber);
    
    // Use the direct service
    return await sendTextMessage(instanceId, phoneNumber, message);
  } catch (error: unknown) {
    console.error('Error sending WhatsApp message:', error);
    // Check if error is an instance of Error to safely access message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}
