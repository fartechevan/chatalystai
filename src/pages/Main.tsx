
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
  
  // Fetch leads data
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*");
      return data || [];
    },
  });

  // Fetch conversations data
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*");
      return data || [];
    },
  });

  // Fetch messages data
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*");
      return data || [];
    },
  });

  // Fetch tasks data
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*");
      return data || [];
    },
  });
  
  return (
    <div className="flex-1 flex flex-col -mt-8 -mx-8">
      <div className="h-[50vh] bg-gradient-to-b from-blue-950/30 to-slate-900/30 bg-cover bg-center" 
           style={{ backgroundImage: "url('/lovable-uploads/da0276ac-84ce-40bf-94fd-f3c49f732c94.png')" }}>
        <div className="container mx-auto px-8 py-6 flex flex-col items-center">
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
      <div className="flex-1 bg-transparent -mt-4 pb-6">
        <div className="container mx-auto px-8">
          <DashboardStats 
            timeFilter={timeFilter} 
            userFilter={userFilter}
            leads={leads}
            conversations={conversations}
            messages={messages}
            tasks={tasks}
          />
        </div>
      </div>
    </div>
  );
}
