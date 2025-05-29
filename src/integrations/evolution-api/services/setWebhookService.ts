import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

// Updated interface to match the new nested structure
interface SetWebhookPayload {
  webhook: {
    enabled: boolean;
    url: string;
    headers: Record<string, string>; // Allow for custom headers if needed later
    byEvents: boolean; // Renamed from webhookByEvents
    base64: boolean;
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
         byEvents: false, // Explicitly set to false as requested
         base64: false, // Explicitly set to false as requested (was already default)
         events: webhookEvents,
      }
     };

     // --- Added Log ---
     // --- End Added Log ---

     // 4. Make request using ApiService
    // Assuming the API returns a simple success/failure or specific structure
    // Adjust response type if needed based on actual API response
    await apiServiceInstance.request<unknown>(setWebhookUrl, { // Changed any to unknown
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return true;

  } catch (error) {
    console.error(`setEvolutionWebhook: Error setting webhook for instance ${instanceName}:`, error);
    // Consider throwing the error or returning false based on desired handling
    return false;
  }
}
