import { StatsCard } from "./StatsCard";
// import { TasksSection } from "./TasksSection"; // Removed
import { MessagesSection } from "./MessagesSection";
// import { LeadSourcesSection } from "./LeadSourcesSection"; // Removed
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types"; // Import Tables type
import { LeadsTrendChart } from "./chart/LeadsTrendChart";
import { DateRange } from "react-day-picker";

interface DashboardStatsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  userFilter: string;
  leads: Tables<'leads'>[]; // Use Tables<'leads'> type
  conversations: Tables<'conversations'>[]; // Use Tables<'conversations'> type
  messages?: Tables<'messages'>[]; // Made optional as we might primarily use whatsappWebMessages for this section
  tasks: Tables<'tasks'>[]; // Use Tables<'tasks'> type
  broadcasts: Tables<'broadcasts'>[];
  broadcastRecipients: Tables<'broadcast_recipients'>[];
  whatsappWebMessages?: Tables<'messages'>[]; // Added new prop
  planMessageUsage?: { messages_sent_this_cycle: number } | null; // Added new prop
  isLoading?: boolean;
  dateRange?: DateRange;
}

export function DashboardStats({
  timeFilter,
  userFilter,
  leads = [],
  conversations = [],
  messages = [],
  tasks = [],
  broadcasts = [],
  broadcastRecipients = [],
  whatsappWebMessages = [], // Added default for new prop
  planMessageUsage = null, // Added default for new prop
  isLoading = false,
  dateRange
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

  const deliveredCount = broadcastRecipients.filter(recipient => recipient.status === 'sent').length;
  const deliveryRate = broadcasts.length > 0 ? (deliveredCount / broadcastRecipients.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4"> {/* Removed lg:grid-rows-3 */}
      {/* Top row */}
      <StatsCard
        title="ACTIVE LEADS"
        value={activeLeads}
        // color will default to text-primary
        subValue={`${leads.reduce((acc, lead) => acc + Number(lead.value || 0), 0)} RM`}
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard
        title="ONGOING CONVERSATIONS"
        value={ongoingConversations}
        // color will default to text-primary
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard
        title="UNANSWERED CONVERSATIONS"
        value={unansweredConversations}
        color="text-warning" // Using theme's warning color
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard
        title="BROADCASTS SENT"
        value={broadcasts.length}
        // color will default to text-primary
        subValue={`${deliveryRate.toFixed(2)}% Delivery Rate`}
        className="col-span-1 lg:col-span-3"
      />

      {/* <LeadSourcesSection className="col-span-1 lg:col-span-3 lg:row-span-2" /> */} {/* Removed */}

      {/* Second row */}
      <StatsCard
        title="WON LEADS"
        value={wonLeads}
        color="text-success" // Using theme's success color
        className="col-span-1 lg:col-span-3"
      />

      <StatsCard
        title="LONGEST AWAITING REPLY"
        value={`${longestAwaitingReplyDays}d`}
        color="text-warning" // Using theme's warning color
        className="col-span-1 lg:col-span-3"
      />

      {/* Third row */}
      <StatsCard
        title="LOST LEADS"
        value={lostLeads}
        color="text-destructive" // Using theme's destructive color
        className="col-span-1 lg:col-span-3"
      />

      {/* <TasksSection
        tasks={tasks}
        className="col-span-1 lg:col-span-6 lg:row-span-1"
      /> */} {/* Removed */}

      <MessagesSection
        messages={whatsappWebMessages} // Use the new prop here
        timeFilter={timeFilter} // Pass timeFilter for context
        planMessageUsage={planMessageUsage} // Pass the new prop
        className="col-span-1 lg:col-span-3 lg:row-span-1"
      />
    </div>
  );
}
