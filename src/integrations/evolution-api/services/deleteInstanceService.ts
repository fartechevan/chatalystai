import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

/**
 * Deletes a specific Evolution API instance using its UUID via the ApiService.
 * @param instanceId - The UUID of the instance to delete.
 * @param integrationId - The ID of the integration to fetch credentials for.
 * @returns A promise that resolves to true if deletion was successful, false otherwise.
 * @throws If fetching credentials or the API request fails (excluding 404).
 */
export async function deleteEvolutionInstance(instanceId: string, integrationId: string): Promise<boolean> {
  if (!instanceId) {
    // console.error("deleteEvolutionInstance: Instance ID (UUID) is required."); // Removed log
    throw new Error("Instance ID (UUID) is required to delete an instance.");
  }
  if (!integrationId) {
    // console.error("deleteEvolutionInstance: Integration ID is required."); // Removed log
    throw new Error("Integration ID is required to fetch credentials for deletion.");
  }

  try {
    // 1. Get Evolution API credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const deleteUrl = `${baseUrl}/instance/delete/${instanceId}`;

    // 3. Make the DELETE request using ApiService
    // We expect a boolean or potentially null/undefined on success from the API,
    // but ApiService might parse JSON. We primarily care about the status code.
    await apiServiceInstance.request<unknown>(deleteUrl, { // Use unknown as response type might vary
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // Use standard Authorization header
        'Content-Type': 'application/json',
      },
    });

    // 4. If the request succeeded (didn't throw), deletion was successful.
    // console.log(`deleteEvolutionInstance: Successfully deleted instance ID ${instanceId} (or it was already gone).`); // Removed log
    return true;

  } catch (error) {
     // Check if the error is a 404 from the ApiService
     if (error instanceof Error && error.message.includes('Status: 404')) {
       // console.warn(`deleteEvolutionInstance: Instance ID ${instanceId} not found (Status: 404). Assuming already deleted.`); // Removed log
       return true; // Treat 404 as success in this context
     }

    // Log the specific service error context before returning false
    // console.error(`deleteEvolutionInstance: Error deleting instance ID ${instanceId} (Integration: ${integrationId}):`, error); // Removed log
    // Return false for other errors to indicate deletion failed
    return false;
  }
}
