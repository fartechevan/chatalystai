import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIntegrationsConfig = () => {
  return useQuery({
    queryKey: ["integrations_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations_config")
        .select("id, instance_display_name");
      if (error) {
        console.error("Error fetching integrations_config:", error);
        return [];
      }
      return data || [];
    },
  });
};
