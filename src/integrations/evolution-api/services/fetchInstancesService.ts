import { apiServiceInstance } from '@/services/api/apiService'; // Import the new ApiService instance
import { EvolutionInstance } from '../types';
import { getEvolutionCredentials } from '../utils/credentials';

/**
 * Fetches all Evolution API instances for a given integration.
 * @param integrationId - The ID of the Evolution API integration.
 * @returns A promise that resolves to an array of Evolution instances found, or an empty array if none exist.
 * @throws If fetching credentials or the API request fails.
 */
export async function fetchEvolutionInstances(integrationId: string): Promise<EvolutionInstance[]> {
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

    // 4. Return all fetched instances
    return instances;
}
