import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

/**
 * Fetches the API key and base URL for a specific integration from the database.
 * Relies on RLS policies to ensure the user can only access their own integrations.
 * @param integrationId - The ID of the integration.
 * @returns An object containing the apiKey, baseUrl, and metadata.
 * @throws If the integration is not found or credentials are missing.
 */
// Using 'unknown' for metadata until Supabase types are regenerated
export async function getEvolutionCredentials(integrationId: string): Promise<{ apiKey: string; baseUrl: string; metadata: unknown | null }> {
  console.log(`Fetching credentials and metadata for integration ID: ${integrationId}`);

  if (!integrationId) {
    throw new Error("Integration ID is required to fetch credentials.");
  }

  // Query the integrations table directly for api_key, base_url, and metadata
  const { data, error } = await supabase
    .from('integrations')
    .select('api_key, base_url, metadata') // Add metadata to select
    .eq('id', integrationId)
    .single<Database['public']['Tables']['integrations']['Row']>(); // Type should ideally include metadata

  if (error) {
    console.error(`Error fetching integration credentials for ${integrationId}:`, error);
    if (error.code === 'PGRST116') { // Not found
      throw new Error(`Integration with ID ${integrationId} not found or access denied.`);
    }
    throw new Error(`Database error fetching credentials: ${error.message}`);
  }

  const apiKey = data?.api_key;
  const baseUrl = data?.base_url;
  // Access metadata using a more specific type assertion, default to null
  const metadata = (data as { metadata?: unknown })?.metadata ?? null;

  // Only API key and Base URL are strictly required for most operations, metadata might be null initially
  if (!apiKey || !baseUrl) {
    const missing = [];
    if (!apiKey) missing.push("API key");
    if (!baseUrl) missing.push("Base URL");
    // Don't throw if metadata is missing, just if core credentials are.
    throw new Error(`Missing required credentials (${missing.join(' and ')}) for integration ${integrationId}.`);
  }

  console.log(`Successfully fetched credentials and metadata for integration ID: ${integrationId}`);
  // Non-null assertions for apiKey and baseUrl are safe here due to the check above
  return { apiKey: apiKey!, baseUrl: baseUrl!, metadata: metadata }; // Return metadata (which will be null if not found)
}
