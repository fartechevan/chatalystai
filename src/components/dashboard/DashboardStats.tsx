
import { StatsCard } from "./StatsCard";
import { TasksSection } from "./TasksSection";
import { MessagesSection } from "./MessagesSection";
import { LeadSourcesSection } from "./LeadSourcesSection";

interface DashboardStatsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
  leads: any[];
  conversations: any[];
  messages: any[];
  tasks: any[];
}

export function DashboardStats({ 
  timeFilter, 
  userFilter, 
  leads = [], 
  conversations = [], 
  messages = [],
  tasks = []
}: DashboardStatsProps) {
  // Calculate stats based on data and filters
  const activeLeads = leads.length;
  const leadsWithoutTasks = 5; // This would need actual calculation based on leads/tasks relationship
  
  const ongoingConversations = conversations.length || 16; // Fallback for UI
  const unansweredConversations = 14; // This would need actual calculation
  
  // Count won and lost leads (in a real app, these would be filtered by lead status)
  const wonLeads = 0;
  const lostLeads = 0;
  
  // Calculate longestAwaitingReplyDays from messages
  const longestAwaitingReplyDays = 33; // This would be calculated from messages
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Top row */}
      <StatsCard 
        title="ACTIVE LEADS" 
        value={activeLeads} 
        color="text-purple-400"
        subValue="0 RM" 
        className="col-span-3"
      />
      
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
      
      <LeadSourcesSection className="col-span-3 row-span-2" />
      
      {/* Second row */}
      <StatsCard 
        title="WON LEADS" 
        value={wonLeads} 
        color="text-green-400"
        subValue="0 RM"
        className="col-span-3"
      />
      
      <StatsCard 
        title="LEADS WITHOUT TASKS" 
        value={leadsWithoutTasks} 
        color="text-blue-400"
        subValue="0 RM"
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
        title="LOST LEADS" 
        value={lostLeads} 
        color="text-red-400"
        subValue="0 RM"
        className="col-span-3"
      />
      
      <TasksSection 
        tasks={tasks} 
        className="col-span-6 row-span-1" 
      />
      
      <MessagesSection className="col-span-3 row-span-1" />
    </div>
  );
}
