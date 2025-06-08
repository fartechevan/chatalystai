
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { useDashboardData } from "@/hooks/useDashboardData";

interface DashboardAnalyticsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
  onTimeChange: (value: 'today' | 'yesterday' | 'week' | 'month') => void;
  onUserChange: (value: string) => void;
}

export function DashboardAnalytics({
  timeFilter,
  userFilter,
  onTimeChange,
  onUserChange,
}: DashboardAnalyticsProps) {
  const { leads, conversations, messages, tasks, broadcasts, broadcastRecipients, whatsappWebMessages, isLoading } = useDashboardData(timeFilter, userFilter);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="w-full mb-2 px-6 pt-6">
        <DashboardFilters
          selectedTime={timeFilter}
          onTimeChange={onTimeChange}
          selectedUser={userFilter}
          onUserChange={onUserChange}
        />
      </div>
      <div className="flex-1 pb-6 px-6">
        <DashboardStats
          timeFilter={timeFilter}
          userFilter={userFilter}
          leads={leads}
          conversations={conversations}
          // messages={messages} // Keep original 'messages' for other potential uses if any
          tasks={tasks}
          broadcasts={broadcasts}
          broadcastRecipients={broadcastRecipients}
          whatsappWebMessages={whatsappWebMessages} // Pass filtered WhatsApp Web messages with a distinct prop
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
