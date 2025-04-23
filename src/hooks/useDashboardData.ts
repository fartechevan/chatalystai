
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "./useDateRange";

export const useDashboardData = (
  timeFilter: 'today' | 'yesterday' | 'week' | 'month',
  userFilter: string
) => {
  const { startDate, endDate } = useDateRange(timeFilter);

  const { data: leads = [], isLoading: isLeadsLoading } = useQuery({
    queryKey: ["leads", timeFilter, userFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (userFilter !== 'all') {
        query = query.eq("user_id", userFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching leads:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ["conversations", timeFilter, userFilter],
    queryFn: async () => {
      const query = supabase
        .from("conversations")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", timeFilter, userFilter],
    queryFn: async () => {
      const query = supabase
        .from("messages")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", timeFilter, userFilter],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (userFilter !== 'all') {
        query = query.eq("assignee_id", userFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
      return data || [];
    },
  });

  return {
    leads,
    conversations,
    messages,
    tasks,
    isLoading: isLeadsLoading || isConversationsLoading || isMessagesLoading || isTasksLoading
  };
};
