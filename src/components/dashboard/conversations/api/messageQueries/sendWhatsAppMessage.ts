// Removed unused supabase import
import { sendTextService, SendTextParams, SendTextResponse } from "@/integrations/evolution-api/services/sendTextService"; // Import service and types
// Assume a similar service for sending media exists or will be created
import { sendMediaService, SendMediaParams, SendMediaResponse } from "@/integrations/evolution-api/services/sendMediaService"; // Hypothetical import
import type { WhatsAppMessageResponse } from "./types"; // Keep response type if still relevant

// Helper to convert file to base64 - should be in a utility file ideally
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

/**
 * Sends a WhatsApp message (text or media) using the Evolution API.
 */
export async function sendWhatsAppMessage(
  instanceId: string, // Evolution Instance Name
  recipientJid: string, // Recipient JID (e.g., xxxxx@c.us)
  message: string, // Text message or caption for media
  integrationsConfigId: string, // DB ID from integrations_config table (used for context, not directly by Evolution API)
  file?: File // Optional file for media messages
): Promise<WhatsAppMessageResponse> {
  try {
    let responseData: SendTextResponse | SendMediaResponse;

    if (file) {
      const base64Media = await toBase64(file);
      const mediaPayload: SendMediaParams = {
        instance: instanceId,
        integrationId: integrationsConfigId, // Pass for context if service needs it
        number: recipientJid,
        media: base64Media,
        mimetype: file.type,
        fileName: file.name,
        caption: message, // Use text message as caption
      };
      responseData = await sendMediaService(mediaPayload);
    } else {
      // Prepare payload for the sendTextService
      const servicePayload: SendTextParams = {
        instance: instanceId,
        integrationId: integrationsConfigId, // Use the integrationsConfigId
        number: recipientJid, // Use JID directly
        text: message,
      };
      responseData = await sendTextService(servicePayload);
    }

    // Assuming services throw on error, we just need to return success format
    return {
      success: true,
      data: responseData // Pass the response data from the service
    };

  } catch (error: unknown) {
    console.error('Error calling sendTextService:', error);
    // Check if error is an instance of Error to safely access message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending message';
    return {
      success: false,
      error: errorMessage
    };
  }
}
