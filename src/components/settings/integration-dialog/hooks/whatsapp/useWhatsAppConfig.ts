
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "../../../types";

export function useWhatsAppConfig(selectedIntegration: Integration | null) {
  const { data: config, isLoading } = useQuery({
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
      
      // Then fetch the configuration
      const { data: config, error: configError } = await supabase
        .from('integrations_config')
        .select('id, integration_id, instance_id, user_reference_id')
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();
      
      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching config:', configError);
        throw configError;
      }
      
      console.log('Configuration data:', config);
      
      // If no config exists, return a default one with the integration's base_url
      if (!config) {
        console.log('No existing config found, returning default');
        return {
          integration_id: selectedIntegration.id,
          base_url: integration.base_url,
          instance_id: ''
        };
      }
      
      // Return the merged object with data from both tables
      return {
        ...config,
        base_url: integration.base_url
      };
    },
    enabled: !!selectedIntegration?.id,
  });

  return { config, isLoading };
}
