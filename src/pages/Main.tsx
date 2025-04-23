
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GetStartedView } from "@/components/dashboard/getting-started/GetStartedView";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { Button } from "@/components/ui/button";

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

  // Get date range based on time filter
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

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

  // Fetch conversations data with filters
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ["conversations", timeFilter, userFilter],
    queryFn: async () => {
      let query = supabase
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

  return (
    <div className="flex-1 flex flex-col -mt-8 -mx-8">
      <div className="bg-white py-6 min-h-screen">
        <div className="container mx-auto px-8">
          <DashboardHeader />
          <div className="flex mt-6 h-[calc(100vh-120px)] rounded-xl overflow-hidden shadow bg-muted/30 border">

            {/* Left vertical menu */}
            <div className="w-48 min-w-[150px] border-r bg-white flex flex-col pt-4">
              <Button
                className={`w-full justify-start px-6 py-3 text-lg ${selectedPanel === 'getting-started' ? "bg-blue-100 font-semibold text-blue-700" : "bg-transparent text-gray-700 hover:bg-muted"}`}
                variant="ghost"
                onClick={() => setSelectedPanel('getting-started')}
              >
                Getting Started
              </Button>
              <Button
                className={`w-full justify-start px-6 py-3 text-lg ${selectedPanel === 'analytics' ? "bg-blue-100 font-semibold text-blue-700" : "bg-transparent text-gray-700 hover:bg-muted"}`}
                variant="ghost"
                onClick={() => setSelectedPanel('analytics')}
              >
                Analytics
              </Button>
            </div>

            {/* Middle panel (content) */}
            <div className="flex-1 bg-transparent h-full overflow-auto">
              {selectedPanel === "getting-started" && (
                <div className="p-6 h-full">
                  {/* Replicate the Getting Started view here */}
                  <GetStartedView />
                </div>
              )}
              {selectedPanel === "analytics" && (
                <div className="p-6 h-full flex flex-col gap-6">
                  <div className="w-full mb-2">
                    <DashboardFilters
                      selectedTime={timeFilter}
                      onTimeChange={setTimeFilter}
                      selectedUser={userFilter}
                      onUserChange={setUserFilter}
                    />
                  </div>
                  <div className="flex-1 pb-6">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
