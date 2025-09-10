import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

/**
 * Gets the current webhook configuration for a given Evolution API instance.
 * @param integrationId - The ID of the integration to fetch credentials.
 * @param instanceName - The name of the instance (instance_display_name).
 * @returns A promise resolving to the webhook configuration or null if not set.
 */
export async function getEvolutionWebhook(
  integrationId: string,
  instanceName: string
): Promise<{
  enabled: boolean;
  url: string;
  events: string[];
  webhook_by_events: boolean;
  webhook_base64: boolean;
} | null> {
  if (!integrationId || !instanceName) {
    console.error("getEvolutionWebhook: Missing required parameters.");
    return null;
  }

  try {
    // 1. Get credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct URL
    const getWebhookUrl = `${baseUrl}/webhook/find/${instanceName}`;

    console.log(`[getEvolutionWebhook] Getting webhook config for instance ${instanceName}`);
    console.log(`[getEvolutionWebhook] URL: ${getWebhookUrl}`);

    // 3. Make request using ApiService
    const response = await apiServiceInstance.request<{
      enabled: boolean;
      url: string;
      events: string[];
      webhook_by_events: boolean;
      webhook_base64: boolean;
    }>(getWebhookUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      logRequests: true,
    });
    
    console.log(`[getEvolutionWebhook] Response:`, response);
    return response;

  } catch (error) {
    console.error(`getEvolutionWebhook: Error getting webhook for instance ${instanceName}:`, error);
    return null;
  }
}