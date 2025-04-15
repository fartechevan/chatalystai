import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';
import { fetchEvolutionInstances } from './fetchInstancesService'; // Import fetch function
import { EvolutionInstance } from '../types'; // Import EvolutionInstance type

/**
 * Deletes a specific Evolution API instance using its display name via the ApiService.
 * It fetches all instances, finds the one matching the display name, and uses its API name for deletion.
 * @param instanceDisplayName - The display name of the instance to delete (corresponds to the 'name' field used by the API).
 * @param integrationId - The ID of the integration to fetch credentials and instances for.
 * @returns A promise that resolves to true if deletion was successful (or instance not found), false otherwise.
 * @throws If fetching credentials fails, or if the instance with the given display name is not found initially (though treated as success).
 */
export async function deleteEvolutionInstance(instanceDisplayName: string, integrationId: string): Promise<boolean> {
  if (!instanceDisplayName) {
    // console.error("deleteEvolutionInstance: Instance display name is required."); // Updated log text
    throw new Error("Instance display name is required to delete an instance.");
  }
  if (!integrationId) {
    // console.error("deleteEvolutionInstance: Integration ID is required."); // Removed log
    throw new Error("Integration ID is required to fetch credentials for deletion.");
  }

  try {
    // 1. Get Evolution API credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Fetch all live instances for the integration
    console.log(`[deleteEvolutionInstance] Fetching all instances for integration ${integrationId} to find display name '${instanceDisplayName}'...`);
    const liveInstances = await fetchEvolutionInstances(integrationId);
    console.log(`[deleteEvolutionInstance] Found ${liveInstances.length} live instances.`);

    // 3. Find the instance matching the display name (using the 'name' field)
    const instanceToDelete = liveInstances.find(inst => inst.name === instanceDisplayName);

    if (!instanceToDelete) {
      // Instance not found among live instances. Could be already deleted or never existed with that name.
      // Treat as success similar to a 404.
      console.warn(`[deleteEvolutionInstance] Instance with display name '${instanceDisplayName}' not found among live instances. Assuming already deleted or name mismatch.`);
      return true;
    }

    // 4. Extract the actual API instance name (which we matched against)
    const instanceApiName = instanceToDelete.name;
    console.log(`[deleteEvolutionInstance] Found matching instance. API name for deletion: ${instanceApiName}`);

    // 5. Construct the Evolution API URL using the API name
    const deleteUrl = `${baseUrl}/instance/delete/${instanceApiName}`;
    console.log(`[deleteEvolutionInstance] Calling DELETE ${deleteUrl}`);

    // 6. Make the DELETE request using ApiService
    await apiServiceInstance.request<unknown>(deleteUrl, {
      method: 'DELETE',
      headers: {
        // Use 'apikey' header based on fetchInstancesService and likely Evolution API standard
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    // 7. If the request succeeded (didn't throw), deletion was successful.
    console.log(`[deleteEvolutionInstance] Successfully deleted instance with display name '${instanceDisplayName}' (API name: ${instanceApiName}).`);
    return true;

  } catch (error) {
     // Check if the error is a 404 from the ApiService during the DELETE call
     if (error instanceof Error && error.message.includes('Status: 404')) {
       // This means the instance existed when fetched but was gone when delete was attempted, or the API name was wrong.
       // Still treat as success in the context of ensuring it's gone.
       console.warn(`[deleteEvolutionInstance] Instance API name not found during DELETE (Status: 404). Assuming already deleted. Display Name: '${instanceDisplayName}'`);
       return true;
     }

    // Log the specific service error context before returning false
    console.error(`[deleteEvolutionInstance] Error deleting instance with display name '${instanceDisplayName}' (Integration: ${integrationId}):`, error);
    // Return false for other errors to indicate deletion failed
    return false;
  }
}
