import { getEvolutionCredentials } from '../utils/credentials';

/**
 * Deletes a specific Evolution API instance using its UUID.
 * @param instanceId - The UUID of the instance to delete.
 * @param integrationId - The ID of the integration to fetch credentials for.
 * @returns A promise that resolves to true if deletion was successful, false otherwise.
 * @throws If fetching credentials or calling the Evolution API fails unexpectedly.
 */
export async function deleteEvolutionInstance(instanceId: string, integrationId: string): Promise<boolean> {
  console.log(`--- deleteEvolutionInstance: Starting deletion for instance ID ${instanceId} (Integration: ${integrationId}) ---`);

  if (!instanceId) {
    throw new Error("Instance ID (UUID) is required to delete an instance.");
  }
  if (!integrationId) {
    throw new Error("Integration ID is required to fetch credentials for deletion.");
  }

  try {
    // 1. Get Evolution API credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL using the instanceId (UUID)
    const deleteUrl = `${baseUrl}/instance/delete/${instanceId}`;
    console.log(`--- deleteEvolutionInstance: Calling Evolution API: ${deleteUrl} ---`);

    // 3. Make the DELETE request
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`--- deleteEvolutionInstance: Evolution API response status: ${response.status} ---`);

    // 4. Handle response
    if (response.ok) {
      // Attempt to parse JSON, but success is primarily based on status code
      try {
        const result = await response.json();
        console.log(`--- deleteEvolutionInstance: Successfully deleted instance ID ${instanceId}. Response:`, result);
        return true;
      } catch (e) {
        // Handle cases where response might not be JSON but status is OK (e.g., 204 No Content)
        console.log(`--- deleteEvolutionInstance: Successfully deleted instance ID ${instanceId} (Status: ${response.status}).`);
        return true;
      }
    } else {
      // Handle specific error cases if needed, e.g., 404 Not Found might mean it's already deleted
      if (response.status === 404) {
         console.warn(`--- deleteEvolutionInstance: Instance ID ${instanceId} not found (Status: 404). Assuming already deleted.`);
         return true; // Treat as success if it doesn't exist
      }
      let errorText = `Status: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        const detail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        errorText += ` - ${detail}`;
      } catch (e) {
        errorText += ` - ${await response.text()}`;
      }
      console.error(`--- deleteEvolutionInstance: Error from Evolution API: ${errorText} ---`);
      // Optionally return false or throw a more specific error
      return false;
    }

  } catch (error) {
    console.error(`--- deleteEvolutionInstance: Error during execution for instance ID ${instanceId} ---`, error);
    // Re-throw or return false depending on desired error handling
    // Returning false might be safer for the flow
    return false;
    // throw error;
  }
}
