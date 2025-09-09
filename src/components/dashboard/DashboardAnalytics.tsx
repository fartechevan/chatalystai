
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import CampaignsCreatedChart from "@/components/dashboard/chart/CampaignsCreatedChart";
import AppointmentsMadeChart from "@/components/dashboard/chart/AppointmentsMadeChart";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { LeadsTrendChart } from "@/components/dashboard/chart/LeadsTrendChart";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface DashboardAnalyticsProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  userFilter: string;
  onTimeChange: (value: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => void;
  onUserChange: (value: string) => void;
}

export function DashboardAnalytics({
  timeFilter,
  userFilter,
  onTimeChange,
  onUserChange,
}: DashboardAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { leads, conversations, messages, tasks, broadcasts, broadcastRecipients, whatsappWebMessages, isLoading } = useDashboardData(
    timeFilter,
    userFilter,
    dateRange ? { from: dateRange.from!, to: dateRange.to! } : undefined
  );

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onTimeChange('custom');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="w-full mb-2 px-6 pt-6 sticky top-0 bg-background z-10 flex flex-col md:flex-row gap-2 justify-between md:items-center">
        <DashboardFilters
          selectedTime={timeFilter}
          onTimeChange={onTimeChange}
          selectedUser={userFilter}
          onUserChange={onUserChange}
        />
        <DateRangeFilter selectedRange={dateRange} onRangeChange={handleDateRangeChange} />
      </div>
      <div className="flex-1 pb-6 px-6 overflow-y-auto">
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
          dateRange={dateRange}
        />
        <div className="mt-6">
          <CampaignsCreatedChart timeFilter={timeFilter} userFilter={userFilter} dateRange={dateRange} />
        </div>
        <div className="mt-6">
          <AppointmentsMadeChart timeFilter={timeFilter} userFilter={userFilter} dateRange={dateRange} />
        </div>
        <div className="mt-6">
          <LeadsTrendChart leads={leads} timeFilter={timeFilter} className="col-span-1 lg:col-span-12" />
        </div>
      </div>
    </div>
  );
}
