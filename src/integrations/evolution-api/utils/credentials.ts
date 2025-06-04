import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

/**
 * Fetches the API key and base URL for a specific integration from the database.
 * Relies on RLS policies to ensure the user can only access their own integrations.
 * @param integrationId - The ID of the integration.
 * @returns An object containing the apiKey and baseUrl.
 * @throws If the integration is not found or credentials are missing.
 */
export async function getEvolutionCredentials(integrationId: string): Promise<{ apiKey: string; baseUrl: string }> { // Removed metadata from return type
  if (!integrationId) {
    throw new Error("Integration ID is required to fetch credentials.");
  }

  // Query the integrations table directly for api_key and base_url
  const { data, error } = await supabase
    .from('integrations')
    .select('api_key, base_url') // Removed metadata from select
    .eq('id', integrationId)
    .single<Pick<Database['public']['Tables']['integrations']['Row'], 'api_key' | 'base_url'>>(); // Adjusted type

  if (error) {
    console.error(`Error fetching integration credentials for ${integrationId}:`, error);
    if (error.code === 'PGRST116') { // Not found
      throw new Error(`Integration with ID ${integrationId} not found or access denied.`);
    }
    throw new Error(`Database error fetching credentials: ${error.message}`);
  }

  const apiKey = data?.api_key;
  const baseUrl = data?.base_url;
  // Removed metadata fetching

  // API key and Base URL are strictly required
  if (!apiKey || !baseUrl) {
    const missing = [];
    if (!apiKey) missing.push("API key");
    if (!baseUrl) missing.push("Base URL");
    throw new Error(`Missing required credentials (${missing.join(' and ')}) for integration ${integrationId}.`);
  }

  // Non-null assertions for apiKey and baseUrl are safe here due to the check above
  return { apiKey: apiKey!, baseUrl: baseUrl! }; // Removed metadata from return
}
