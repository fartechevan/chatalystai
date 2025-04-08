import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "@/components/settings/types"; // Correct path
// Config import no longer needed as API key is handled server-side
import type { EvolutionApiConfig } from "../types"; // Correct path

export function useEvolutionApiConfig(selectedIntegration: Integration | null) {
  const { data: config, isLoading } = useQuery<EvolutionApiConfig | null>({ // Use specific type
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      
      console.log('Fetching config for integration ID:', selectedIntegration.id);
      
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
      
      console.log('Integration data:', integration);

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
        console.log('No existing config found, returning default structure.');
        return {
          integration_id: selectedIntegration.id,
          base_url: integration.base_url,
          instance_id: '', // Default empty instance_id
          instance_display_name: '', // Default empty display name
          // token is intentionally omitted for default
        };
      } else {
        // 3. If we reach here, there was no error and configResult.data is not null.
        console.log('Existing config found, constructing final config:', configResult.data);
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
    enabled: !!selectedIntegration?.id,
  });

  return { config, isLoading };
}
