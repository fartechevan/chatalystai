import { supabase } from "@/integrations/supabase/client";
import type { IntegrationConfigUpsertData } from "@/integrations/evolution-api/types"; // Use alias path

/**
 * Invokes the Supabase Edge Function to sync the Evolution API instance configuration.
 * The backend function handles fetching/creating the instance and saving config to the DB.
 * @param integrationId - The ID of the integration record in the database.
 * @returns The configuration data saved by the backend function.
 * @param integrationId - The ID of the integration record in the database.
 * @param instanceName - (Optional) The desired name for the instance if it needs to be created.
 * @returns The configuration data saved by the backend function.
 * @throws If the function invocation fails.
 */
export async function syncEvolutionInstanceConfig(
  integrationId: string,
  instanceName?: string | null // Add optional instanceName parameter
): Promise<IntegrationConfigUpsertData | null> {
  if (!integrationId) {
    throw new Error("Integration ID is required to sync instance config.");
  }

  const requestBody: { action: string; integrationId: string; instanceName?: string } = {
    action: 'sync-instance-config',
    integrationId: integrationId,
  };

  if (instanceName) {
    requestBody.instanceName = instanceName; // Add name to body if provided
  }


  const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
    body: requestBody, // Send the constructed body
  });

  if (error) {
    console.error('[syncEvolutionInstanceConfig] Error invoking Supabase function:', error);
    throw new Error(`Failed to sync instance configuration: ${error.message}`);
  }

  // Assuming the backend function returns { success: true, data: configData } on success
  if (data?.success && data?.data) {
    return data.data as IntegrationConfigUpsertData;
  } else if (!data?.success) {
    // Handle cases where the function executed but reported failure
    throw new Error(data?.message || 'Backend function reported an unspecified error during sync.');
  }

  // Fallback if response structure is unexpected
  return null;
}
