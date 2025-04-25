/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types.ts";

// Define the structure of credentials expected to be returned
// Adapt this based on what different integrations might store
interface IntegrationCredentials {
  apiKey: string | null;
  baseUrl: string | null;
  // Add other common credential fields if needed, e.g., appId, secretKey
}

/**
 * Fetches potentially sensitive credentials for a given integration ID.
 * This function should typically use a Service Role client for access.
 *
 * @param supabaseClient A Supabase client instance (ideally Service Role).
 * @param integrationId The ID of the integration.
 * @returns An object containing the credentials or an error message.
 */
export async function fetchIntegrationCredentialsById(
  supabaseClient: SupabaseClient<Database>,
  integrationId: string
): Promise<{ credentials: IntegrationCredentials | null; error?: string }> {
  if (!integrationId) {
    return { credentials: null, error: "Integration ID is required." };
  }

  try {
    console.log(`Fetching credentials for integration ID: ${integrationId}...`);
    // Assuming credentials like api_key and base_url are stored directly on the integrations table
    // Adjust the select statement if they are in a different table (e.g., integrations_config)
    // or if they are stored in an encrypted/JSON column (like 'decrypted_credentials' used previously).

    // Option 1: Credentials directly on 'integrations' table
    const { data, error } = await supabaseClient
      .from('integrations')
      .select('api_key, base_url') // Select the relevant credential columns
      .eq('id', integrationId)
      .single(); // Expect a single row

    // Option 2: Credentials in 'decrypted_credentials' JSON column on 'integrations' table
    /*
    const { data, error } = await supabaseClient
      .from('integrations')
      .select('decrypted_credentials')
      .eq('id', integrationId)
      .single();
    */

    if (error) {
      console.error(`Database error fetching credentials for integration ${integrationId}:`, error);
      if (error.code === 'PGRST116') { // Handle 'No rows found' specifically
        return { credentials: null, error: `Integration with ID ${integrationId} not found.` };
      }
      return { credentials: null, error: `Database error: ${error.message}` };
    }

    // Process the fetched data based on where credentials are stored
    let apiKey: string | null = null;
    let baseUrl: string | null = null;

    // If using Option 1 (direct columns):
    if (data) {
        apiKey = data.api_key;
        baseUrl = data.base_url;
    }

    // If using Option 2 (JSON column):
    /*
    if (data && data.decrypted_credentials) {
        const creds = data.decrypted_credentials as any; // Type assertion might be needed
        apiKey = creds.EVOLUTION_API_KEY || null;
        baseUrl = creds.EVOLUTION_API_URL || null;
    }
    */

    // Validate that essential credentials were found
    if (!apiKey || !baseUrl) {
        const missing: string[] = [];
        if (!apiKey) missing.push("API key");
        if (!baseUrl) missing.push("Base URL");
        const errorMsg = `${missing.join(' and ')} not found or is null in database for integration ${integrationId}.`;
        console.warn(errorMsg);
        // Return null credentials but maybe not an error, let caller decide
        return { credentials: { apiKey: null, baseUrl: null }, error: errorMsg };
    }

    console.log(`Retrieved credentials from database for integration ${integrationId}`);
    return { credentials: { apiKey, baseUrl }, error: undefined };

  } catch (dbError) {
    console.error(`Unexpected database access error for integration ${integrationId}:`, dbError);
    return { credentials: null, error: `Unexpected database error: ${dbError.message}` };
  }
}
