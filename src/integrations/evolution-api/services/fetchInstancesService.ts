import { apiServiceInstance } from '@/services/api/apiService'; // Import the new ApiService instance
import { EvolutionInstance } from '../types';
import { getEvolutionCredentials } from '../utils/credentials';

/**
 * Fetches the first Evolution API instance for a given integration.
 * If multiple instances exist, only the first one is returned.
 * @param integrationId - The ID of the Evolution API integration.
 * @returns A promise that resolves to the first Evolution instance found, or null if no instances exist.
 * @throws If fetching credentials or the API request fails.
 */
export async function fetchEvolutionInstances(integrationId: string): Promise<EvolutionInstance | null> {
  if (!integrationId) {
    // console.error("fetchEvolutionInstances: Integration ID is required."); // Removed log
    throw new Error("Integration ID is required to fetch instances.");
  }

  // 1. Get Evolution API credentials (Errors will propagate up)
  const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    // 2. Construct the Evolution API URL
    const fetchUrl = `${baseUrl}/instance/fetchInstances`;

    // 3. Make the request using the ApiService
    const instances = await apiServiceInstance.request<EvolutionInstance[]>(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      // Optionally override logging for this specific call if needed:
      // logRequests: true,
    });

    // 4. Return the first instance if available, otherwise null
    return instances.length > 0 ? instances[0] : null;
}
