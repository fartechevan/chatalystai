import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

// Updated interface to match the new nested structure
interface SetWebhookPayload {
  webhook: {
    enabled: boolean;
    url: string;
    headers: Record<string, string>; // Allow for custom headers if needed later
    webhook_by_events: boolean; // Match Evolution API expected property name
    webhook_base64: boolean; // Match Evolution API expected property name
    events: string[];
  };
}

/**
 * Sets the webhook configuration for a given Evolution API instance.
 * @param integrationId - The ID of the integration to fetch credentials.
 * @param instanceName - The name of the instance (instance_display_name).
 * @param webhookUrl - The URL for the webhook endpoint.
 * @param webhookEvents - An array of event names to subscribe to.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function setEvolutionWebhook(
  integrationId: string,
  instanceName: string,
  webhookUrl: string,
  webhookEvents: string[]
): Promise<boolean> {
  if (!integrationId || !instanceName || !webhookUrl || !webhookEvents || webhookEvents.length === 0) {
    console.error("setEvolutionWebhook: Missing required parameters.");
    return false;
  }

  try {
    // 1. Get credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct URL
    const setWebhookUrl = `${baseUrl}/webhook/set/${instanceName}`;

    // 3. Prepare payload using the new nested structure
    const payload: SetWebhookPayload = {
      webhook: {
        enabled: true, // Default to enabled
         url: webhookUrl,
         headers: {}, // Default to empty headers
         webhook_by_events: false, // Explicitly set to false as requested
         webhook_base64: false, // Explicitly set to false as requested (was already default)
         events: webhookEvents,
      }
     };

     // Add detailed logging for debugging
     console.log(`[setEvolutionWebhook] Setting webhook for instance ${instanceName}:`);
     console.log(`[setEvolutionWebhook] URL: ${setWebhookUrl}`);
     console.log(`[setEvolutionWebhook] API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
     console.log(`[setEvolutionWebhook] Webhook URL: ${webhookUrl}`);
     console.log(`[setEvolutionWebhook] Events: ${webhookEvents.join(', ')}`);
     console.log(`[setEvolutionWebhook] Payload: ${JSON.stringify(payload)}`);

     // 4. Make request using ApiService
    // Assuming the API returns a simple success/failure or specific structure
    // Adjust response type if needed based on actual API response
    const response = await apiServiceInstance.request<unknown>(setWebhookUrl, { // Changed any to unknown
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      logRequests: true, // Enable logging for this request
    });
    
    console.log(`[setEvolutionWebhook] Response:`, response);

    return true;

  } catch (error) {
    console.error(`setEvolutionWebhook: Error setting webhook for instance ${instanceName}:`, error);
    // Consider throwing the error or returning false based on desired handling
    return false;
  }
}
