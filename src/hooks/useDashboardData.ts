
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

  // Log the date range being used
  console.log(`useDashboardData - timeFilter: ${timeFilter}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);

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
    queryKey: ["broadcasts", timeFilter, userFilter],
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
    queryKey: ["broadcastRecipients", timeFilter, userFilter], // Keep timeFilter for cache invalidation if needed
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
    queryKey: ["appointments", timeFilter], // Not filtering by userFilter for now
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
  };

  const dailyActivityData = (() => {
    if (isBroadcastsLoading || isBroadcastRecipientsLoading || isAppointmentsLoading) { // isSegmentsLoading will be added later
      return [];
    }

    const activityMap = new Map<string, { date: string; segmentedCampaignUsers: Set<string>; appointmentsMade: number }>();

    // Helper to get YYYY-MM-DD from a date string or Date object
    const getFormattedDate = (dateInput: string | Date) => {
      const date = new Date(dateInput);
      return date.toISOString().split('T')[0];
    };

    // Populate map with all dates in the range
    let currentDate = new Date(startDate);
    const endRangeDate = new Date(endDate);
    while (currentDate <= endRangeDate) {
      const formattedDate = getFormattedDate(currentDate);
      if (!activityMap.has(formattedDate)) {
        activityMap.set(formattedDate, { date: formattedDate, segmentedCampaignUsers: new Set(), appointmentsMade: 0 });
      }
      // Create a new Date object for the next iteration to satisfy linter and avoid mutation issues
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      currentDate = nextDate;
    }
    
    // Process appointments
    appointments.forEach(appointment => {
      if (appointment.created_at) {
        const date = getFormattedDate(appointment.created_at);
        if (activityMap.has(date)) {
          activityMap.get(date)!.appointmentsMade++;
        }
      }
    });

    // Process segmented broadcasts and their recipients
    const segmentedBroadcastsList = broadcasts.filter(b => b.segment_id !== null);
    segmentedBroadcastsList.forEach(broadcast => {
      if (broadcast.created_at && broadcast.id) {
        const broadcastDate = getFormattedDate(broadcast.created_at);
        if (activityMap.has(broadcastDate)) {
          const recipientsOfThisBroadcast = broadcastRecipients.filter(
            br => br.broadcast_id === broadcast.id && br.customer_id
          );
          recipientsOfThisBroadcast.forEach(recipient => {
            activityMap.get(broadcastDate)!.segmentedCampaignUsers.add(recipient.customer_id!);
          });
        }
      }
    });
    
    return Array.from(activityMap.values()).map(item => ({
      date: item.date,
      segmentedCampaignUsers: item.segmentedCampaignUsers.size,
      appointmentsMade: item.appointmentsMade,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  const segmentPerformanceData = (() => {
    if (isSegmentsLoading || isBroadcastsLoading || isBroadcastRecipientsLoading || isAppointmentsLoading) {
      return [];
    }

    return allSegments.map(segment => {
      // Find broadcasts for this segment within the time filter
      const broadcastsForThisSegment = broadcasts.filter(
        b => b.segment_id === segment.id && 
             new Date(b.created_at!) >= startDate && 
             new Date(b.created_at!) <= endDate
      );

      if (broadcastsForThisSegment.length === 0) {
        return {
          segmentId: segment.id,
          segmentName: segment.name || 'Unnamed Segment',
          targetedCustomersCount: 0,
          appointmentsFromSegmentContacts: 0,
        };
      }

      const broadcastIdsForSegment = broadcastsForThisSegment.map(b => b.id);
      
      // Get all phone numbers from recipients of these broadcasts
      const phoneNumbersTargeted = new Set<string>();
      broadcastRecipients.forEach(br => {
        if (broadcastIdsForSegment.includes(br.broadcast_id) && br.phone_number) {
          phoneNumbersTargeted.add(br.phone_number);
        }
      });

      // Count appointments from these phone numbers within the time filter
      let appointmentsCount = 0;
      appointments.forEach(appointment => {
        if (appointment.contact_identifier && phoneNumbersTargeted.has(appointment.contact_identifier)) {
          // Ensure appointment is also within the time filter (already filtered by query, but good for consistency)
           if (new Date(appointment.created_at!) >= startDate && new Date(appointment.created_at!) <= endDate) {
            appointmentsCount++;
          }
        }
      });

      return {
        segmentId: segment.id,
        segmentName: segment.name || 'Unnamed Segment',
        targetedCustomersCount: phoneNumbersTargeted.size,
        appointmentsFromSegmentContacts: appointmentsCount,
      };
    });
  })();

  return {
    leads,
    conversations,
    messages, // messages.length will be used for count
    tasks,
    subscriptionPlan, // Contains plan name and limits (messages_per_month, token_allocation)
    // tokenUsage: tokenUsageData?.tokensUsed ?? 0, // Actual tokens used in the period
    planLimits, // Extracted limits for convenience
    broadcasts,
    broadcastRecipients,
    appointments,
    segmentedBroadcasts: broadcasts.filter(b => b.segment_id !== null), // Keep this for other potential uses
    dailyActivityData, // Add new aggregated data
    segmentPerformanceData, // Add new segment performance data
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
      // isTokenUsageLoading ||
      isTokenAllocationLoading ||
      isAppointmentsLoading ||
      isSegmentsLoading, // Added isSegmentsLoading
  };
};
