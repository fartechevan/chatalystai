
import { supabase } from "@/integrations/supabase/client";

/**
 * Gets dynamic credentials for the Evolution API from various sources
 */
export async function getEvolutionApiCredentials(
  integrationId?: string,
  instanceId?: string
): Promise<{
  apiKey: string | null;
  baseUrl: string | null;
}> {
  console.log(`Getting Evolution API credentials for integration: ${integrationId || 'default'}`);
  
  try {
    // If integrationId is provided, try to get credentials from that specific integration
    if (integrationId) {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('api_key, base_url')
        .eq('id', integrationId)
        .single();
      
      if (integrationError) throw integrationError;
      
      if (integration) {
        return {
          apiKey: integration.api_key || null,
          baseUrl: integration.base_url || null,
        };
      }
    }

    // If no direct integration credentials or no integrationId, try to get from configuration
    // This could be based on instanceId if provided
    if (instanceId) {
      const { data: config, error: configError } = await supabase
        .from('integrations_config')
        .select('token, integrations(base_url)')
        .eq('instance_id', instanceId)
        .single();
      
      if (configError) {
        console.error("Error fetching integration config:", configError);
      } else if (config) {
        // Handle potential nested object from join query
        const baseUrl = config.integrations ? 
          (typeof config.integrations === 'object' ? 
            (config.integrations as any).base_url : null) 
          : null;
          
        return {
          apiKey: config.token || null,
          baseUrl: baseUrl,
        };
      }
    }

    // If all else fails, try to get from vault
    const { data: secretData, error: secretError } = await supabase
      .rpc('get_evolution_api_key');
    
    if (secretError) {
      console.error("Error fetching from vault:", secretError);
    }

    // If we can't get from vault or no API key obtained, use default URL at least
    return {
      apiKey: secretData || null,
      baseUrl: "https://api.evoapicloud.com", // Default fallback
    };
  } catch (error) {
    console.error("Error retrieving Evolution API credentials:", error);
    return {
      apiKey: null,
      baseUrl: "https://api.evoapicloud.com", // Default fallback
    };
  }
}
