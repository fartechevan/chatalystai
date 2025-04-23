
import { useState } from "react";
import { GetStartedView } from "@/components/dashboard/getting-started/GetStartedView";
import { MainDashboardSidebar } from "@/components/dashboard/MainDashboardSidebar";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function Main() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('month');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [selectedPanel, setSelectedPanel] = useState<'getting-started' | 'analytics'>('getting-started');
  const { userData } = useAuthUser();

  return (
    <div className="flex flex-1 h-full">
      <div className="w-64 min-w-[200px] border-r bg-muted/30">
        <MainDashboardSidebar
          selectedPanel={selectedPanel}
          onSelect={setSelectedPanel}
        />
      </div>
      <div className="flex-1 bg-transparent h-full overflow-auto">
        {selectedPanel === "getting-started" && (
          <div className="h-full">
            <GetStartedView userData={userData} />
          </div>
        )}
        {selectedPanel === "analytics" && (
          <DashboardAnalytics
            timeFilter={timeFilter}
            userFilter={userFilter}
            onTimeChange={setTimeFilter}
            onUserChange={setUserFilter}
          />
        )}
      </div>
    </div>
  );
}
