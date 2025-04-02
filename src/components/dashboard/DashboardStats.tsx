
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { StatsCard } from "./StatsCard";
import { TasksSection } from "./TasksSection";
import { MessagesSection } from "./MessagesSection";
import { LeadSourcesSection } from "./LeadSourcesSection";

interface DashboardStatsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
}

export function DashboardStats({ timeFilter, userFilter }: DashboardStatsProps) {
  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*");
      return data || [];
    },
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*");
      return data || [];
    },
  });

  // Fetch leads
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*");
      return data || [];
    },
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", timeFilter, userFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*");
      return data || [];
    },
  });

  // Calculate longestAwaitingReplyDays
  const longestAwaitingReplyDays = 33; // Hardcoded as per screenshot, but could be calculated from real data

  // Active leads (static for now, based on screenshot)
  const activeLeads = 5;
  const leadsWithoutTasks = 5;
  
  // This would typically come from a query, but we're matching the screenshot
  const ongoingConversations = 16;
  const unansweredConversations = 14;
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Top row */}
      <StatsCard 
        title="ONGOING CONVERSATIONS" 
        value={ongoingConversations} 
        color="text-purple-400"
        className="col-span-3"
      />
      
      <StatsCard 
        title="UNANSWERED CONVERSATIONS" 
        value={unansweredConversations} 
        color="text-purple-400"
        className="col-span-3"
      />
      
      <LeadSourcesSection className="col-span-6 row-span-2" />
      
      {/* Second row */}
      <StatsCard 
        title="MEDIAN REPLY TIME" 
        value="0" 
        color="text-green-400"
        className="col-span-3"
      />
      
      <StatsCard 
        title="LONGEST AWAITING REPLY" 
        value={`${longestAwaitingReplyDays}d`} 
        color="text-blue-400"
        className="col-span-3"
      />
      
      {/* Third row */}
      <StatsCard 
        title="WON LEADS" 
        value="0" 
        color="text-green-400"
        subValue="0"
        subLabel="RM"
        className="col-span-3"
      />
      
      <StatsCard 
        title="ACTIVE LEADS" 
        value={activeLeads} 
        color="text-blue-400"
        subValue="0"
        subLabel="RM"
        className="col-span-3"
      />
      
      <TasksSection className="col-span-3 row-span-2" />
      
      <MessagesSection className="col-span-3 row-span-2" />
      
      {/* Fourth row */}
      <StatsCard 
        title="LOST LEADS" 
        value="0" 
        color="text-green-400"
        subValue="0"
        subLabel="RM"
        className="col-span-3"
      />
      
      <StatsCard 
        title="LEADS WITHOUT TASKS" 
        value={leadsWithoutTasks} 
        color="text-blue-400"
        subValue="0"
        subLabel="RM"
        className="col-span-3"
      />
    </div>
  );
}
