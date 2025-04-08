import { getEvolutionCredentials } from "../utils/credentials";

/**
 * Logs out a specific Evolution API instance directly.
 * @param instanceId The ID of the instance to log out.
 * @param integrationId The ID of the integration to fetch credentials for.
 * @returns Promise<{ success: boolean }> Indicates if the logout was successful.
 * @throws If fetching credentials or calling the Evolution API fails.
 */
export const logoutInstance = async (
  instanceId: string | null,
  integrationId: string | null
): Promise<{ success: boolean }> => {

  if (!instanceId || !integrationId) {
    console.error('Instance ID and Integration ID are required for logout.');
    throw new Error('Instance ID and Integration ID are required.');
  }

  console.log(`Attempting to log out instance ${instanceId} (Integration: ${integrationId})...`);

  try {
    // 1. Fetch credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/logout/${instanceId}`;
    console.log(`Frontend: Logging out directly via Evolution API: ${apiUrl}`);

    // 3. Make the direct request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: "DELETE", // Use DELETE method for logout
      headers: {
        "apikey": apiKey,
      },
    });

    // 4. Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Frontend: Evolution API logout failed (${evoResponse.status}): ${errorText}`);
      throw new Error(`Evolution API Logout Error (${evoResponse.status}): ${errorText}`);
    }

    // 5. Logout successful
    console.log(`Frontend: Logout successful for instance ${instanceId}`);
    return { success: true };

  } catch (error) {
    // Catch errors from credential fetching or fetch itself
    console.error(`Error during logoutInstance service call for instance ${instanceId}:`, error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
};
