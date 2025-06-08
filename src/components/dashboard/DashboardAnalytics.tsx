
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
// import BroadcastsAppointmentsChart from "@/components/dashboard/chart/BroadcastsAppointmentsChart"; // Removed
// import SegmentedBroadcastsAppointmentsChart from "@/components/dashboard/chart/SegmentedBroadcastsAppointmentsChart"; // To be replaced
import SegmentPerformanceChart from "@/components/dashboard/chart/SegmentPerformanceChart"; // Added new chart
import DailyActivityTrendChart from "@/components/dashboard/chart/DailyActivityTrendChart"; 
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
        {/* <div className="mt-6"> // Removed BroadcastsAppointmentsChart
          <BroadcastsAppointmentsChart timeFilter={timeFilter} userFilter={userFilter} />
        </div> */}
        <div className="mt-6"> {/* Replaced SegmentedBroadcastsAppointmentsChart with SegmentPerformanceChart */}
          <SegmentPerformanceChart timeFilter={timeFilter} userFilter={userFilter} />
        </div>
        <div className="mt-6"> 
          <DailyActivityTrendChart timeFilter={timeFilter} userFilter={userFilter} />
        </div>
      </div>
    </div>
  );
}
