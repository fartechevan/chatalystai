import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

interface SetWebhookPayload {
  url: string;
  webhookByEvents: boolean; // Assuming this is always needed/true based on typical usage
  events: string[];
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

    // 3. Prepare payload
    const payload: SetWebhookPayload = {
      url: webhookUrl,
      webhookByEvents: true, // Assuming true is the desired default
      events: webhookEvents,
    };

    console.log(`Attempting to set webhook for instance ${instanceName}:`, payload);

    // 4. Make request using ApiService
    // Assuming the API returns a simple success/failure or specific structure
    // Adjust response type if needed based on actual API response
    await apiServiceInstance.request<any>(setWebhookUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`Successfully set webhook for instance ${instanceName}`);
    return true;

  } catch (error) {
    console.error(`setEvolutionWebhook: Error setting webhook for instance ${instanceName}:`, error);
    // Consider throwing the error or returning false based on desired handling
    return false;
  }
}
