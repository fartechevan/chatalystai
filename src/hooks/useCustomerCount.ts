
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCustomerCount() {
  const { data: customerCount = 0, isLoading } = useQuery({
    queryKey: ['customers-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching customer count:', error);
        return 0;
      }

      return count || 0;
    },
  });

  return { customerCount, isLoading };
}
