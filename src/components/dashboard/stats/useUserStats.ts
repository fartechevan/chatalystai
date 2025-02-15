
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserStats() {
  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: currentMonth } = useQuery({
    queryKey: ["current-month"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_current_month");
      if (error) throw error;
      return data[0];
    },
  });

  const { data: currentWeek } = useQuery({
    queryKey: ["current-week"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_current_week");
      if (error) throw error;
      return data[0];
    },
  });

  const { data: monthlyConversations = [] } = useQuery({
    queryKey: ["monthly-conversations", currentMonth?.month_number],
    queryFn: async () => {
      if (!userData?.id || !currentMonth) return [];

      const startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`sender_id.eq.${userData.id},receiver_id.eq.${userData.id}`)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!userData?.id && !!currentMonth,
  });

  const { data: weeklyConversations = [] } = useQuery({
    queryKey: ["weekly-conversations", currentWeek?.week_of_month],
    queryFn: async () => {
      if (!userData?.id || !currentWeek) return [];

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`sender_id.eq.${userData.id},receiver_id.eq.${userData.id}`)
        .gte("created_at", startOfWeek.toISOString())
        .lte("created_at", endOfWeek.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!userData?.id && !!currentWeek,
  });

  return {
    monthlyConversations,
    weeklyConversations,
    currentMonth,
    currentWeek,
  };
}
