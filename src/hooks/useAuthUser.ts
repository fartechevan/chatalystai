
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuthUser = () => {
  // Destructure isLoading along with data
  const { data: userData, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Return both userData and isLoading
  return { userData, isLoading };
};
