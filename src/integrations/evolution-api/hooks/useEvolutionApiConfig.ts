import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "@/components/settings/types"; // Correct path
// Config import no longer needed as API key is handled server-side
import type { EvolutionApiConfig } from "@/integrations/evolution-api/types"; // Use alias path

export function useEvolutionApiConfig(selectedIntegration: Integration | null) {
  // Destructure refetch from useQuery result
  const { data: config, isLoading, refetch } = useQuery<EvolutionApiConfig | null>({ // Use specific type
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      
      // First fetch the integration to get the base_url
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('id, base_url')
        .eq('id', selectedIntegration.id)
        .single();
      
      if (integrationError) {
        console.error('Error fetching integration:', integrationError);
        throw integrationError;
      }
      
      // Define the expected shape of the data returned by the query
      type ConfigDataShape = {
        id: string;
        integration_id: string;
        instance_id: string;
        user_reference_id: string | null;
        token: string | null;
        instance_display_name: string | null; // Add the new field
      };
      // Define the expected shape of the Supabase query result
      type ConfigQueryResult = {
        data: ConfigDataShape | null;
        error: { message: string; code: string; details: string; hint: string } | null; // Simplified error shape
      };

      // Then fetch the configuration, including the token and display name, and type the result
      const configResult: ConfigQueryResult = await supabase
        .from('integrations_config')
        .select('id, integration_id, instance_id, user_reference_id, token, instance_display_name') // Select the new field
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();

      // 1. Check for actual errors first
      if (configResult.error && configResult.error.code !== 'PGRST116') { // PGRST116: No rows found, treat as null data, not error
        console.error('Error fetching config:', configResult.error);
        throw configResult.error; // Throw actual database/network errors
      }

      // 2. Check if data exists in the result
      if (!configResult.data) {
        // This means no config row was found (PGRST116 or null data)
        // Ensure all fields from EvolutionApiConfig are present, setting missing ones to null/undefined
        const defaultConfig: EvolutionApiConfig = {
          integration_id: selectedIntegration.id, // Required
          base_url: integration.base_url,         // Required (fetched from integration)
          instance_id: null,                      // Set to null
          instance_display_name: null,            // Set to null
          token: null,                            // Set to null
          user_reference_id: null,                // Set to null (as it's optional)
          id: undefined,                          // Set to undefined (as it's optional row id)
        };
        return defaultConfig;
      } else {
        // 3. If we reach here, there was no error and configResult.data is not null.
        // Construct finalConfig directly using configResult.data
        const finalConfig: EvolutionApiConfig = {
          integration_id: selectedIntegration.id,
          base_url: integration.base_url,
          id: configResult.data.id,
          instance_id: configResult.data.instance_id,
          user_reference_id: configResult.data.user_reference_id,
          token: configResult.data.token,
          instance_display_name: configResult.data.instance_display_name, // Include the display name
        };
        return finalConfig;
      }
    },
    // Keep staleTime low or 0 if immediate refetching is critical after invalidation
    staleTime: 0,
    // Keep cacheTime reasonable
    // cacheTime: 5 * 60 * 1000, // 5 minutes (default)
    enabled: !!selectedIntegration?.id,
  });

  // Return refetch along with config and isLoading
  return { config, isLoading, refetch };
}
