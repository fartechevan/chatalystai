
import { StatsCard } from "./StatsCard";
import { TasksSection } from "./TasksSection";
import { MessagesSection } from "./MessagesSection";
import { LeadSourcesSection } from "./LeadSourcesSection";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStatsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
  leads: any[];
  conversations: any[];
  messages: any[];
  tasks: any[];
  isLoading?: boolean;
}

export function DashboardStats({ 
  timeFilter, 
  userFilter, 
  leads = [], 
  conversations = [], 
  messages = [],
  tasks = [],
  isLoading = false
}: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-4">
        {Array(12).fill(0).map((_, i) => (
          <Skeleton key={i} className={`h-[140px] ${i > 3 ? 'col-span-3' : 'col-span-3'}`} />
        ))}
      </div>
    );
  }
  
  // Calculate stats based on data and filters
  const activeLeads = leads.length;
  
  // Count leads without tasks by comparing lead IDs that don't have associated tasks
  const leadsWithoutTasks = leads.filter(lead => 
    !tasks.some(task => task.lead_id === lead.id)
  ).length;
  
  // Get ongoing conversations directly from conversations table
  const ongoingConversations = conversations.length;
  
  // Set unanswered conversations - these will come from the conversations table
  const unansweredConversations = conversations.filter(conv => {
    // In a real app, this would be based on a status field or similar
    return conv.status === 'unanswered';
  }).length;
  
  // Count won and lost leads (in a real app, these would be filtered by lead status)
  // For this example, we'll just count leads in specific pipeline stages
  const wonLeads = leads.filter(lead => lead.status === 'won').length;
  const lostLeads = leads.filter(lead => lead.status === 'lost').length;
  
  // Set longest awaiting reply days to 0 as requested
  const longestAwaitingReplyDays = 0;
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Top row */}
      <StatsCard 
        title="ACTIVE LEADS" 
        value={activeLeads} 
        color="text-purple-400"
        subValue={`${leads.reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`} 
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
        subValue={`${leads.filter(l => l.status === 'won').reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-3"
      />
      
      <StatsCard 
        title="LEADS WITHOUT TASKS" 
        value={leadsWithoutTasks} 
        color="text-blue-400"
        subValue={`${leads.filter(lead => !tasks.some(task => task.lead_id === lead.id)).reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
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
        subValue={`${leads.filter(l => l.status === 'lost').reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-3"
      />
      
      <TasksSection 
        tasks={tasks} 
        className="col-span-6 row-span-1" 
      />
      
      <MessagesSection 
        messages={messages}
        className="col-span-3 row-span-1" 
      />
    </div>
  );
}
