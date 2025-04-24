
import { StatsCard } from "./StatsCard";
import { TasksSection } from "./TasksSection";
import { MessagesSection } from "./MessagesSection"; 
import { LeadSourcesSection } from "./LeadSourcesSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

interface DashboardStatsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
  leads: Tables<'leads'>[]; // Use Tables<'leads'> type
  conversations: Tables<'conversations'>[]; // Use Tables<'conversations'> type
  messages: Tables<'messages'>[]; // Use Tables<'messages'> type
  tasks: Tables<'tasks'>[]; // Use Tables<'tasks'> type
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

  // Placeholder: Calculation skipped as per user request. Requires clarification on how leads and tasks are related.
  const leadsWithoutTasks = 0; 

  // Get ongoing conversations directly from conversations table
  const ongoingConversations = conversations.length;

  // Placeholder: Calculation skipped as per user request. Requires clarification on how to identify unanswered conversations.
  const unansweredConversations = 0; 

  // Placeholder: Calculate won leads based on pipeline_stage_id. Requires the ID for the 'Won' stage.
  // Example: const wonStageId = '...'; // Replace with actual Won stage ID
  // const wonLeads = leads.filter(lead => lead.pipeline_stage_id === wonStageId).length;
  const wonLeads = 0; 

  // Placeholder: Calculate lost leads based on pipeline_stage_id. Requires the ID for the 'Lost' stage.
  // Example: const lostStageId = '...'; // Replace with actual Lost stage ID
  // const lostLeads = leads.filter(lead => lead.pipeline_stage_id === lostStageId).length;
  const lostLeads = 0; 

  // Set longest awaiting reply days to 0 as requested (assuming this logic is correct or placeholder)
  const longestAwaitingReplyDays = 0;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4"> {/* Removed lg:grid-rows-3 */}
      {/* Top row */}
      <StatsCard 
        title="ACTIVE LEADS" 
        value={activeLeads} 
        color="text-purple-400"
        subValue={`${leads.reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`} 
        className="col-span-1 lg:col-span-3"
      />
      
      <StatsCard 
        title="ONGOING CONVERSATIONS" 
        value={ongoingConversations} 
        color="text-purple-400"
        className="col-span-1 lg:col-span-3"
      />
      
      <StatsCard 
        title="UNANSWERED CONVERSATIONS"
        value={unansweredConversations} 
        color="text-purple-400"
        className="col-span-1 lg:col-span-3"
      />
      
      <LeadSourcesSection className="col-span-1 lg:col-span-3 lg:row-span-2" />
      
      {/* Second row */}
      <StatsCard
        title="WON LEADS"
        value={wonLeads}
        color="text-green-400"
        // Placeholder: Requires Won stage ID
        // subValue={`${leads.filter(l => l.pipeline_stage_id === wonStageId).reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard
        title="LEADS WITHOUT TASKS"
        value={leadsWithoutTasks}
        color="text-blue-400"
        // Placeholder: Requires clarification on leads/tasks relationship
        // subValue={`${leads.filter(lead => /* logic for leads without tasks */).reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard 
        title="LONGEST AWAITING REPLY" 
        value={`${longestAwaitingReplyDays}d`} 
        color="text-blue-400"
        className="col-span-1 lg:col-span-3"
      />
      
      {/* Third row */}
      <StatsCard
        title="LOST LEADS"
        value={lostLeads}
        color="text-red-400"
        // Placeholder: Requires Lost stage ID
        // subValue={`${leads.filter(l => l.pipeline_stage_id === lostStageId).reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-1 lg:col-span-3"
      />

      <TasksSection 
        tasks={tasks} 
        className="col-span-1 lg:col-span-6 lg:row-span-1"
      />
      
      <MessagesSection 
        messages={messages}
        className="col-span-1 lg:col-span-3 lg:row-span-1"
      />
    </div>
  );
}
