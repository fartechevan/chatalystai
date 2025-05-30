import { Outlet, useLocation } from "react-router-dom";
import { DashboardSidebar, menuItems, MenuItem } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeft, Menu as MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
// Tabs imports are removed as they are no longer used directly in this layout for main content
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// GetStartedView and DashboardAnalytics are also removed as content is now driven by Outlet
// import { GetStartedView } from "./getting-started/GetStartedView";
// import { DashboardAnalytics } from "./DashboardAnalytics";
import React, { useState } from "react"; // Import React for useState

export interface PageHeaderContextType {
  setHeaderActions: React.Dispatch<React.SetStateAction<React.ReactNode | null>>;
}

export function DashboardLayout() {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const location = useLocation();
  const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null);

  const getCurrentTitle = () => {
    // Handle the base /dashboard route explicitly
    if (location.pathname === "/dashboard") {
      const dashboardItem = menuItems.find(item => item.path === "/dashboard");
      return dashboardItem ? dashboardItem.title : "Dashboard";
    }
    // For other routes, find the matching item, excluding the base /dashboard
    const currentItem = menuItems.find(
      (item) => item.path !== "/dashboard" && location.pathname.startsWith(item.path)
    );
    // Also check for profile page
    if (location.pathname === "/dashboard/profile") {
      return "Profile";
    }
    return currentItem ? currentItem.title : "Dashboard"; // Default to "Dashboard"
  };

  const pageTitle = getCurrentTitle();
  // const [activeTab, setActiveTab] = React.useState("overview"); // activeTab state is no longer needed
  // Dummy state for DashboardAnalytics props - replace with actual state management if needed
  // const [timeFilter, setTimeFilter] = React.useState<'today' | 'yesterday' | 'week' | 'month'>('month'); // timeFilter state is no longer needed
  // const [userFilter, setUserFilter] = React.useState('all'); // userFilter state is no longer needed


  return (
    <div className="flex h-screen bg-background"> {/* Main container */}
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden"> {/* Content wrapper */}
        {/* Tabs component is removed as Outlet will handle content */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          {/* Mobile Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 sm:hidden" // Only on small screens
            onClick={toggleSidebar}
          >
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
          {/* Desktop Toggle Button */}
          {/* Placed at the start of the content header, appears next to the sidebar */}
          <Button
            variant="outline"
            size="icon"
            className="hidden shrink-0 sm:inline-flex" // Hidden on small, visible on sm+
            onClick={toggleSidebar}
          >
            <PanelLeft className={cn("h-5 w-5", state === "collapsed" && "rotate-180")} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <h1 className="text-xl font-semibold hidden sm:inline-flex">{pageTitle}</h1>
          
          <div className="ml-auto flex items-center gap-4 md:gap-2 lg:gap-4">
            {headerActions}
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-auto p-4 lg:p-6">
          {/* Outlet is added here to render child routes, passing context */}
          <Outlet context={{ setHeaderActions } satisfies PageHeaderContextType} />
        </main>
      </div>
    </div>
  );
}
