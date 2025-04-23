
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIntegrationsCount() {
  const { data: integrationsCount = 0, isLoading } = useQuery({
    queryKey: ['integrations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('integrations_config')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching integrations count:', error);
        return 0;
      }

      return count || 0;
    },
  });

  return { integrationsCount, isLoading };
}
