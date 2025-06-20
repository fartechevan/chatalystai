
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIntegrationsCount() {
  const { data: integrationsCount = 0, isLoading } = useQuery({
    queryKey: ['integrations-count'], // Reverted: Removed currentUserId from queryKey
    queryFn: async () => {
      // Reverted: Removed user-specific filtering
      const { count, error } = await supabase
        .from('integrations_config')
        .select('*', { count: 'exact', head: true }); // Reverted to select '*' for simplicity, head:true is efficient

      if (error) {
        console.error('Error fetching total integrations count:', error); // Updated error message
        return 0;
      }
      return count || 0;
    },
    // Reverted: Query is always enabled
  });

  return { integrationsCount, isLoading };
}
