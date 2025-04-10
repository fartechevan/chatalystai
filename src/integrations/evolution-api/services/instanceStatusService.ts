
import checkInstanceStatus from "./checkInstanceStatusService";
import { ConnectionState } from "@/components/settings/types";

export { checkInstanceStatus };

/**
 * Wrapper function to check instance status using base Evolution API services.
 * This handles the credential retrieval and passes them to the core function.
 */
export async function checkInstanceConnectionStatus(
  instanceId: string,
  integrationId: string
): Promise<ConnectionState> {
  try {
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    if (!apiKey || !baseUrl) {
      console.error('Missing credentials for status check');
      return 'unknown';
    }

    return await checkInstanceStatus(instanceId, apiKey, baseUrl);
  } catch (error) {
    console.error('Error in checkInstanceConnectionStatus:', error);
    return 'unknown';
  }
}

// Import the credentials utility to make the wrapper function work
import { getEvolutionCredentials } from "./utils/credentials";
