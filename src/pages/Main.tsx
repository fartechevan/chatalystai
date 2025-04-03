
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";

export default function Main() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [userFilter, setUserFilter] = useState<string>('all');
  
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
      let query = supabase
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
      <div className="bg-white py-6">
        <div className="container mx-auto px-8 flex flex-col items-center">
          <DashboardHeader />
          <div className="mt-8 w-full">
            <DashboardFilters 
              selectedTime={timeFilter}
              onTimeChange={setTimeFilter}
              selectedUser={userFilter}
              onUserChange={setUserFilter}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 pb-6">
        <div className="container mx-auto px-8 -mt-4">
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
    </div>
  );
}
