
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "../../../types";

export function useWhatsAppConfig(selectedIntegration: Integration | null) {
  const { data: config, isLoading } = useQuery({
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('id, integration_id, instance_id, base_url')
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no config exists, return a default one
      if (!data) {
        return {
          integration_id: selectedIntegration.id,
          base_url: 'https://api.evoapicloud.com',
          instance_id: ''
        };
      }
      
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

  return { config, isLoading };
}
