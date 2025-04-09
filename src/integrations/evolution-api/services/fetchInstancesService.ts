import { EvolutionInstance } from '../types'; // Corrected import path
import { getEvolutionCredentials } from '../utils/credentials'; // Import the shared utility

/**
 * Fetches the list of Evolution API instances for a given integration.
 * @param integrationId - The ID of the Evolution API integration.
 * @returns A promise that resolves to an array of Evolution instances.
 * @throws If fetching credentials or calling the Evolution API fails.
 */
export async function fetchEvolutionInstances(integrationId: string): Promise<EvolutionInstance[]> {
  console.log(`--- fetchEvolutionInstances: Starting for integration ${integrationId} ---`);

  if (!integrationId) {
    throw new Error("Integration ID is required to fetch instances.");
  }

  try {
    // 1. Get Evolution API credentials from the database (via Supabase client)
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const fetchUrl = `${baseUrl}/instance/fetchInstances`;
    console.log(`--- fetchEvolutionInstances: Fetching from Evolution API: ${fetchUrl} ---`);

    // 3. Make the request to the Evolution API
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`--- fetchEvolutionInstances: Evolution API response status: ${response.status} ---`);

    // 4. Handle potential errors from the Evolution API
    if (!response.ok) {
      let errorText = `Status: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        // Check for common Evolution API error structures
        const detail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        errorText += ` - ${detail}`;
      } catch (e) {
        // Fallback if response is not JSON
        errorText += ` - ${await response.text()}`;
      }
      console.error(`--- fetchEvolutionInstances: Error from Evolution API: ${errorText} ---`);
      throw new Error(`Failed to fetch instances from Evolution API: ${errorText}`);
    }

    // 5. Parse the JSON response
    const instances: EvolutionInstance[] = await response.json();
    console.log(`--- fetchEvolutionInstances: Successfully fetched ${instances.length} instances ---`);
    console.log(`--- fetchEvolutionInstances: API Response: ${JSON.stringify(instances)} ---`);

    // 6. Return the result
    return instances;

  } catch (error) {
    console.error(`--- fetchEvolutionInstances: Error during execution for integration ${integrationId} ---`, error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}
