
// Removed unused supabase import
import { sendTextService, SendTextParams, SendTextResponse } from "@/integrations/evolution-api/services/sendTextService"; // Import service and types
import type { WhatsAppMessageResponse } from "./types"; // Keep response type if still relevant

/**
 * Sends a WhatsApp message using the Evolution API sendTextService.
 */
export async function sendWhatsAppMessage(
  instanceId: string,
  recipient: string,
  message: string,
  integrationsId: string // Changed parameter name
): Promise<WhatsAppMessageResponse> {
  try {
    console.log(`Sending WhatsApp message via sendTextService. InstanceId: ${instanceId}, Recipient: ${recipient}, IntegrationId: ${integrationsId}`);

    // Extract phone number without the @c.us suffix if present
    const phoneNumber = recipient.includes('@') ? recipient.split('@')[0] : recipient;

    console.log('Phone number being sent to service:', phoneNumber);

    // Prepare payload for the sendTextService
    const servicePayload: SendTextParams = {
      instance: instanceId,
      integrationId: integrationsId, // Use the new integrationsId
      number: phoneNumber,
      text: message,
      // Add any other optional params from SendTextParams if needed later
    };

    console.log('sendTextService request payload:', servicePayload);

    // Call the local service function
    const responseData: SendTextResponse = await sendTextService(servicePayload);

    console.log('sendTextService response:', responseData);

    // Assuming sendTextService throws on error, we just need to return success format
    // If sendTextService returns an error object, adjust handling here
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
