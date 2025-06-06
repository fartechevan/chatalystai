
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "./useDateRange";
import { useAuthUser } from "./useAuthUser";

export const useDashboardData = (
  timeFilter: 'today' | 'yesterday' | 'week' | 'month',
  userFilter: string
) => {
  const { startDate, endDate } = useDateRange(timeFilter);
  const { userData: authUser, isLoading: isAuthUserLoading } = useAuthUser();
  const currentUserId = authUser?.id;

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

  const { data: subscriptionPlan, isLoading: isSubscriptionPlanLoading } = useQuery({
    queryKey: ["subscriptionPlan", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("profile_id", currentUserId)
        .or("status.eq.active,status.eq.trialing")
        .maybeSingle(); // Use maybeSingle to handle no active subscription gracefully

      if (error) {
        console.error("Error fetching subscription plan:", error);
        return null;
      }
      return data;
    },
    enabled: !!currentUserId,
  });

  const { data: userTokenAllocation, isLoading: isTokenAllocationLoading } = useQuery({
    queryKey: ["userTokenAllocation", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from("token_allocations")
        .select("monthly_tokens")
        .eq("user_id", currentUserId)
        .single(); // Assuming one allocation record per user

      if (error) {
        console.error("Error fetching token allocation:", error);
        return null; // Or a default like { monthly_tokens: 0 }
      }
      return data;
    },
    enabled: !!currentUserId,
  });

  const { data: tokenUsageData, isLoading: isTokenUsageLoading } = useQuery({
    queryKey: ["tokenUsage", currentUserId, timeFilter],
    queryFn: async () => {
      if (!currentUserId) return { tokensUsed: 0 }; // Changed: removed tokenLimit from here

      // Fetch token usage for the period
      const { data: usage, error: usageError } = await supabase
        .from("token_usage")
        .select("tokens_used")
        .eq("user_id", currentUserId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (usageError) {
        console.error("Error fetching token usage:", usageError);
        // Fallback to 0 if error, or could return null/throw
      }
      
      const tokensUsed = usage ? usage.reduce((acc, item) => acc + item.tokens_used, 0) : 0;
      
      // Get token limit from the plan (already fetched in subscriptionPlan)
      // For now, just returning the sum.
      return { tokensUsed };
    },
    enabled: !!currentUserId,
  });

  const planLimits = {
    messagesPerMonth: subscriptionPlan?.plans?.messages_per_month ?? null,
    // Token allocation now comes from userTokenAllocation
    tokenAllocation: userTokenAllocation?.monthly_tokens ?? null, 
  };

  return {
    leads,
    conversations,
    messages, // messages.length will be used for count
    tasks,
    subscriptionPlan, // Contains plan name and limits (messages_per_month, token_allocation)
    tokenUsage: tokenUsageData?.tokensUsed ?? 0, // Actual tokens used in the period
    planLimits, // Extracted limits for convenience
    isLoading: 
      isLeadsLoading || 
      isConversationsLoading || 
      isMessagesLoading || 
      isTasksLoading || 
      isAuthUserLoading || 
      isSubscriptionPlanLoading ||
      isTokenUsageLoading ||
      isTokenAllocationLoading, // Added loading state
  };
};
