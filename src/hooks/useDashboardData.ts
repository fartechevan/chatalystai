
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "./useDateRange";
import { useAuthUser } from "./useAuthUser";

export const useDashboardData = (
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom',
  userFilter: string,
  customDateRange?: { from: Date; to: Date }
) => {
  const { startDate, endDate } = useDateRange(timeFilter, customDateRange);
  const { userData: authUser, isLoading: isAuthUserLoading } = useAuthUser();
  const currentUserId = authUser?.id;

  // Log the date range being used
  console.log(`useDashboardData - timeFilter: ${timeFilter}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
  console.log("useDashboardData - currentUserId:", currentUserId);

  const { data: leads = [], isLoading: isLeadsLoading } = useQuery({
    queryKey: ["leads", timeFilter, userFilter, customDateRange],
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
    queryKey: ["conversations", timeFilter, userFilter, customDateRange],
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
    queryKey: ["messages", timeFilter, userFilter, customDateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: broadcasts = [], isLoading: isBroadcastsLoading } = useQuery({
    queryKey: ["broadcasts", timeFilter, userFilter, customDateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*, segment_id") // Ensure segment_id is fetched
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) {
        console.error("Error fetching broadcasts:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: broadcastRecipients = [], isLoading: isBroadcastRecipientsLoading } = useQuery({
    queryKey: ["broadcastRecipients", timeFilter, userFilter, customDateRange], // Keep timeFilter for cache invalidation if needed
    queryFn: async () => {
      // Fetch all recipients and filter in code, or adjust query if recipients have a reliable created_at
      // For now, fetching relevant fields and we can filter later based on broadcast dates.
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select("*"); // Reverted to select all fields

      if (error) {
        console.error("Error fetching broadcast recipients:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: integrations = [], isLoading: isIntegrationsLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      // Assuming 'name' is the column to identify 'WhatsApp Web'
      const { data, error } = await supabase.from("integrations").select("id, name");
      if (error) {
        console.error("Error fetching integrations:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", timeFilter, userFilter, customDateRange],
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
    queryKey: ["subscriptionPlan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .or("status.eq.active,status.eq.trialing");

      if (error) {
        console.error("Error fetching subscription plan:", error);
        return null;
      }
      // Assuming there is only one active subscription in the system, take the first one.
      return data && data.length > 0 ? data[0] : null;
    },
  });

  // Log subscriptionPlan after its query
  console.log("useDashboardData - subscriptionPlan object:", subscriptionPlan);

  const { data: planMessageUsage, isLoading: isPlanMessageUsageLoading } = useQuery({
    queryKey: ["planMessageUsage", subscriptionPlan?.id], 
    queryFn: async () => {
      console.log("planMessageUsage queryFn - subscriptionPlan?.id:", subscriptionPlan?.id);
      if (!subscriptionPlan?.id) {
        console.log("planMessageUsage queryFn: No subscriptionPlan.id, returning null.");
        return null;
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const currentYear = currentDate.getFullYear();
      
      console.log(`planMessageUsage queryFn - Querying with: subscription_id=${subscriptionPlan.id}, month=${currentMonth}, year=${currentYear}`);

      const { data, error } = await supabase
        .from("plan_message_usage")
        .select("messages_sent_this_cycle")
        .eq("subscription_id", subscriptionPlan.id)
        .eq("billing_cycle_month", currentMonth)
        .eq("billing_cycle_year", currentYear)
        .maybeSingle();

      console.log("planMessageUsage queryFn - Supabase response: data:", data, "error:", error);

      if (error) {
        console.error("Error fetching plan message usage:", error);
        return { messages_sent_this_cycle: 0 }; // Return a default or handle error appropriately
      }
      const result = data ?? { messages_sent_this_cycle: 0 };
      console.log("planMessageUsage queryFn - Returning:", result);
      return result; // Ensure a value is returned
    },
    enabled: !!subscriptionPlan?.id, 
  });

  const { data: userTokenAllocation, isLoading: isTokenAllocationLoading } = useQuery({
    queryKey: ["userTokenAllocation", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from("token_allocations")
        .select("monthly_tokens")
        .eq("user_id", currentUserId)
        .maybeSingle(); // Allow zero or one allocation record

      if (error) {
        console.error("Error fetching token allocation:", error);
        return null; 
      }
      return data;
    },
    enabled: !!currentUserId,
  });

  const { data: allSegments = [], isLoading: isSegmentsLoading } = useQuery({
    queryKey: ["allSegments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segments")
        .select("id, name");
      if (error) {
        console.error("Error fetching segments:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: appointments = [], isLoading: isAppointmentsLoading } = useQuery({
    queryKey: ["appointments", timeFilter, userFilter, customDateRange], // Not filtering by userFilter for now
    queryFn: async () => {
      const query = supabase
        .from("appointments")
        .select("id, created_at, contact_identifier") // Added contact_identifier
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching appointments:", error);
        return [];
      }
      return data || [];
    },
  });

  // const { data: tokenUsageData, isLoading: isTokenUsageLoading } = useQuery({
  //   queryKey: ["tokenUsage", currentUserId, timeFilter],
  //   queryFn: async () => {
  //     if (!currentUserId) return { tokensUsed: 0 }; // Changed: removed tokenLimit from here

  //     // Fetch token usage for the period
  //     const { data: usage, error: usageError } = await supabase
  //       .from("token_usage")
  //       .select("tokens_used")
  //       .eq("user_id", currentUserId)
  //       .gte("created_at", startDate.toISOString())
  //       .lte("created_at", endDate.toISOString());

  //     if (usageError) {
  //       console.error("Error fetching token usage:", usageError);
  //       // Fallback to 0 if error, or could return null/throw
  //     }
      
  //     const tokensUsed = usage ? usage.reduce((acc, item) => acc + item.tokens_used, 0) : 0;
      
  //     // Get token limit from the plan (already fetched in subscriptionPlan)
  //     // For now, just returning the sum.
  //     return { tokensUsed };
  //   },
  //   enabled: !!currentUserId,
  // });

  const planLimits = {
    messagesPerMonth: subscriptionPlan?.plans?.messages_per_month ?? null,
    // Token allocation now comes from userTokenAllocation
    tokenAllocation: userTokenAllocation?.monthly_tokens ?? null, 
    integrationsAllowed: subscriptionPlan?.plans?.integrations_allowed ?? null,
  };

  return {
    leads,
    conversations,
    messages, // messages.length will be used for count (retained for other potential uses or if needed)
    tasks,
    subscriptionPlan, // Contains plan name and limits (messages_per_month, token_allocation)
    planMessageUsage, // Contains messages_sent_this_cycle
    // tokenUsage: tokenUsageData?.tokensUsed ?? 0, // Actual tokens used in the period
    planLimits, // Extracted limits for convenience
    broadcasts,
    broadcastRecipients,
    appointments,
    segmentedBroadcasts: broadcasts.filter(b => b.segment_id !== null), // Keep this for other potential uses
    // Derived state for WhatsApp Web messages
    whatsappWebMessages: (() => {
      if (isMessagesLoading || isConversationsLoading || isIntegrationsLoading || !messages || !conversations || !integrations) {
        return [];
      }
      // Find the WhatsApp Web integration ID. Adjust 'WhatsApp Web' string if needed.
      const whatsAppWebIntegration = integrations.find(
        (integ) => integ.name?.toLowerCase() === 'whatsapp web' || integ.name?.toLowerCase() === 'whatsapp'
      );

      if (!whatsAppWebIntegration || !whatsAppWebIntegration.id) {
        return []; // WhatsApp Web integration not found or has no ID
      }

      // Get conversation IDs linked to WhatsApp Web
      const whatsAppWebConversationIds = new Set(
        conversations
          .filter(conv => conv.integrations_id === whatsAppWebIntegration.id)
          .map(conv => conv.conversation_id)
      );

      // Filter messages belonging to these conversations
      return messages.filter(msg => msg.conversation_id && whatsAppWebConversationIds.has(msg.conversation_id));
    })(),
    isLoading:
      isLeadsLoading ||
      isConversationsLoading ||
      isMessagesLoading ||
      isBroadcastsLoading ||
      isBroadcastRecipientsLoading ||
      isIntegrationsLoading || // Added
      isTasksLoading ||
      isAuthUserLoading ||
      isSubscriptionPlanLoading ||
      isPlanMessageUsageLoading || // Added loading state for planMessageUsage
      // isTokenUsageLoading ||
      isTokenAllocationLoading ||
      isAppointmentsLoading ||
      isSegmentsLoading, // Added isSegmentsLoading
  };
};
