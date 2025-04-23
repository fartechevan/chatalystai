import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GetStartedView } from "@/components/dashboard/getting-started/GetStartedView";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { User } from "@supabase/supabase-js"; // Import User type if not already present at top
// Removed DashboardHeader import
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { MainDashboardSidebar } from "@/components/dashboard/MainDashboardSidebar"; // Import the new sidebar

export default function Main() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('month'); // Default to 'month'
  const [userFilter, setUserFilter] = useState<string>('all');
  const [selectedPanel, setSelectedPanel] = useState<'getting-started' | 'analytics'>('getting-started');

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Fetch integrations count
  const { data: integrationsCount = 0, isLoading: isIntegrationsLoading } = useQuery<number>({
    queryKey: ["integrations-count", userData?.id], // Use user ID in the query key
    queryFn: async () => {
      const user = userData as User | null; // Type assertion for clarity
      console.log("Fetching integrations count for user ID:", user?.id); // Log user ID
      if (!user?.id) {
        console.log("User ID not available, returning 0 integrations.");
        return 0; // Don't run if user ID is not available
      }

      // Try selecting a specific column instead of '*'
      const { count, error } = await supabase
        .from("integrations_config")
        .eq("user_id", user.id); // Filter by user ID

      if (error) {
        console.error("Error fetching integrations count:", error);
        return 0;
      }
      console.log("Supabase returned count:", count); // Log the count
      return count ?? 0; // Return the count or 0 if null/undefined
    },
    enabled: !!userData?.id, // Only run the query when userData.id is available
  });


  // Get date range based on time filter
  const getDateRange = () => {
    const now = new Date();
    const startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() - 1);
        now.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch leads data with filters
  const { data: leads = [], isLoading: isLeadsLoading } = useQuery({
    queryKey: ["leads", timeFilter, userFilter],
    queryFn: async () => {
      let query = supabase // Revert back to let
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

  // Fetch conversations data with filters
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ["conversations", timeFilter, userFilter],
    queryFn: async () => {
      const query = supabase // Change to const as it's not reassigned
        .from("conversations")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // For conversations, we'd need to check user_id through related tables
      // This is simplified here - in real implementation, you might need to join tables

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
      return data || [];
    },
  });

  // Fetch messages data with filters
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", timeFilter, userFilter],
    queryFn: async () => {
      const query = supabase
        .from("messages")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // If needed, add filtering for user

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
      return data || [];
    },
  });

  // Fetch tasks data with filters
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", timeFilter, userFilter],
    queryFn: async () => {
      let query = supabase // Revert back to let
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

  return (
    // Removed outer div with negative margins and bg-white div
    <div className="flex flex-1 h-full"> {/* Make this the main flex container, removed flex-col */}
      {/* Removed container div and DashboardHeader */}
      {/* The main content area now directly contains the sidebar and content */}
      {/* Use the new sidebar */}
      <div className="w-64 min-w-[200px] border-r bg-muted/30"> {/* Added border and bg here */}
              <MainDashboardSidebar
                selectedPanel={selectedPanel}
                onSelect={setSelectedPanel}
              />
            </div>
            {/* Main content area */}
            <div className="flex-1 bg-transparent h-full overflow-auto">
              {selectedPanel === "getting-started" && (
                <div className="h-full"> {/* Removed p-6 */}
                  {/* Pass integrationsCount as a prop */}
                  <GetStartedView userData={userData} integrationsCount={integrationsCount} />
                </div>
              )}
              {selectedPanel === "analytics" && (
                <div className="h-full flex flex-col gap-6"> {/* Removed p-6 */}
                  {/* Consider adding padding back selectively if needed */}
                  <div className="w-full mb-2 px-6 pt-6"> {/* Added padding back here for filters */}
                    <DashboardFilters
                      selectedTime={timeFilter}
                      onTimeChange={setTimeFilter}
                      selectedUser={userFilter}
                      onUserChange={setUserFilter}
                    />
                  </div>
                  <div className="flex-1 pb-6 px-6"> {/* Added horizontal padding back here for stats */}
                    <DashboardStats
                      timeFilter={timeFilter}
                      userFilter={userFilter}
                      leads={leads}
                      conversations={conversations}
                      messages={messages}
                      tasks={tasks}
                      isLoading={isLeadsLoading || isConversationsLoading || isMessagesLoading || isTasksLoading}
                    />
                  </div>
                </div>
              )}
            </div> {/* Closes main content area */}
    </div>
  );
}
