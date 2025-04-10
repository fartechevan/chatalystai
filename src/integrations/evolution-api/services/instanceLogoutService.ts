import { apiServiceInstance } from "@/services/api/apiService";
import { getEvolutionCredentials } from "../utils/credentials";

/**
 * Logs out a specific Evolution API instance using ApiService.
 * @param instanceId The ID of the instance to log out.
 * @param integrationId The ID of the integration to fetch credentials for.
 * @returns Promise<{ success: boolean }> Indicates if the logout was successful.
 * @throws If fetching credentials or calling the Evolution API fails.
 */
export const logoutInstance = async (
  instanceId: string | null,
  integrationId: string | null,
): Promise<{ success: boolean }> => {
  if (!instanceId || !integrationId) {
    // console.error("logoutInstance: Instance ID and Integration ID are required."); // Removed log
    // Throw error as per original logic for missing IDs
    throw new Error("Instance ID and Integration ID are required for logout.");
  }

  // 1. Fetch credentials (Errors will propagate up)
  const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/logout/${instanceId}`;

    // 3. Make the request using ApiService
    // Logout might return success status with no body or a simple JSON { success: true }
    await apiServiceInstance.request<unknown>(apiUrl, { // Use unknown as response type might vary
      method: "DELETE",
      headers: {
        "apikey": apiKey,
      },
    });

    // 4. If the request succeeded (didn't throw), logout was successful.
    // Logging handled by ApiService if enabled.
    // console.log(`logoutInstance: Logout successful for instance ${instanceId}`); // Removed log
    return { success: true };
};
