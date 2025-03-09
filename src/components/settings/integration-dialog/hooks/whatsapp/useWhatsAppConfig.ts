
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
        .select('*')
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

  return { config, isLoading };
}
