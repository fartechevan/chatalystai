import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GetStartedView } from "@/components/dashboard/getting-started/GetStartedView";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { useAuthUser } from "@/hooks/useAuthUser";
import { PageHeaderContextType, TabValue } from "@/components/dashboard/DashboardLayout"; // Import context type and TabValue

export default function Main() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  const [userFilter, setUserFilter] = useState<string>('all');
  const { userData } = useAuthUser();
  
  // Consume activeTab from context
  const { activeTab } = useOutletContext<PageHeaderContextType>();

  // Tab bar is now removed from here and managed in DashboardLayout

  return (
    // Removed the outer div that contained the tab bar
    // The main content area will now fill the space provided by DashboardLayout's <main>
    <div className="flex-1 bg-transparent h-full overflow-auto"> {/* Ensure this div takes up available space */}
      {activeTab === "overview" && (
        <div className="h-full">
          <GetStartedView userData={userData} />
        </div>
      )}
      {activeTab === "analytics" && (
        <DashboardAnalytics
          timeFilter={timeFilter}
          userFilter={userFilter}
          onTimeChange={setTimeFilter}
          onUserChange={setUserFilter}
        />
      )}
    </div>
  );
}
