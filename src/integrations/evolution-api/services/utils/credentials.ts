
/**
 * Utility functions for retrieving Evolution API credentials.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Retrieves the API key and base URL for the Evolution API from the Supabase database.
 * @param integrationId The ID of the integration to retrieve credentials for.
 * @returns An object containing the apiKey, baseUrl, and optional metadata.
 */
export async function getEvolutionCredentials(integrationId: string): Promise<{ 
  apiKey: string; 
  baseUrl: string;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Fetch integration details including API key and base URL
    const { data, error } = await supabase
      .from('integrations')
      .select('api_key, base_url, metadata')
      .eq('id', integrationId)
      .single();

    if (error) {
      console.error('Error fetching Evolution API credentials:', error);
      throw new Error(`Failed to fetch credentials: ${error.message}`);
    }

    return {
      apiKey: data.api_key || '',
      baseUrl: data.base_url || 'https://api.evoapicloud.com', // Default URL
      metadata: data.metadata
    };
  } catch (err) {
    console.error('Exception in getEvolutionCredentials:', err);
    // Return empty strings rather than null to avoid further errors
    return { apiKey: '', baseUrl: 'https://api.evoapicloud.com' };
  }
}
