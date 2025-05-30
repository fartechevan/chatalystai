import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar, menuItems, MenuItem } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { PageActionProvider, usePageActionContext } from "@/context/PageActionContext"; // Import new context
import { useSidebar } from "@/components/ui/sidebar";
import { HeaderPrimaryActionButton } from "./HeaderPrimaryActionButton";
import { HeaderSecondaryActionSlot } from "./HeaderSecondaryActionSlot";
import { HeaderBreadcrumbSlot } from "./HeaderBreadcrumbSlot";
import { ConditionalPageTitle } from "./ConditionalPageTitle"; // Import ConditionalPageTitle
import { HeaderSettingsSearchInput } from "./HeaderSettingsSearchInput"; // Import the new search input
import { PanelLeft, Menu as MenuIcon, PlusCircle, Upload, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportDocumentForm } from "@/components/knowledge/ImportDocumentForm";
import { CreateDocumentDialog } from "@/components/knowledge/CreateDocumentDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
// Tabs imports are removed as they are no longer used directly in this layout for main content
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// GetStartedView and DashboardAnalytics are also removed as content is now driven by Outlet
// import { GetStartedView } from "./getting-started/GetStartedView";
// import { DashboardAnalytics } from "./DashboardAnalytics";
import React, { useState, useEffect } from "react"; // Import React for useState

export interface PageHeaderContextType {
  setHeaderActions: React.Dispatch<React.SetStateAction<React.ReactNode | null>>;
}

// Define a new internal component for the header content
const DashboardHeaderContent: React.FC<{
  pageTitle: string;
  isKnowledgeBasePage: boolean;
  isStatsPage: boolean; // New prop
  headerActions: React.ReactNode | null;
  onShowImportForm: () => void;
  onShowCreateDialog: () => void;
  toggleSidebar: () => void; // Added toggleSidebar
  sidebarState: string; // Added sidebarState
}> = ({
  pageTitle,
  isKnowledgeBasePage,
  isStatsPage, // New prop
  headerActions,
  onShowImportForm,
  onShowCreateDialog,
  toggleSidebar, // Added toggleSidebar
  sidebarState, // Added sidebarState
}) => {
  const { headerNavNode, setIsBatchDateRangeDialogOpen } = usePageActionContext(); // Now called within a child of PageActionProvider

  return (
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
      <Button
        variant="outline"
        size="icon"
        className="hidden shrink-0 sm:inline-flex" // Hidden on small, visible on sm+
        onClick={toggleSidebar}
      >
        <PanelLeft className={cn("h-5 w-5", sidebarState === "collapsed" && "rotate-180")} />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
      <HeaderBreadcrumbSlot />
      <ConditionalPageTitle pageTitle={pageTitle} />
      {headerNavNode && <div className="flex items-center gap-2 ml-4">{headerNavNode}</div>}
      
      <div className="ml-auto flex items-center gap-4 md:gap-2 lg:gap-4">
        <HeaderSettingsSearchInput />
        {isStatsPage && (
          <Button onClick={() => setIsBatchDateRangeDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Batch Analysis
          </Button>
        )}
        <HeaderSecondaryActionSlot />
        <HeaderPrimaryActionButton />
        {isKnowledgeBasePage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Document
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShowImportForm} className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowCreateDialog} className="cursor-pointer">
                <FilePlus className="h-4 w-4 mr-2" />
                Create New Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {headerActions}
      </div>
    </header>
  );
};

export function DashboardLayout() {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const location = useLocation();
  // const navigate = useNavigate(); // navigate is not used
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // headerNavNode is now consumed by DashboardHeaderContent

  const handleImportSuccess = () => {
    setShowImportForm(false);
    toast({
      title: "Document imported",
      description: "Your document has been successfully imported.",
    });
    queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
  };

  const handleCreateSuccess = (documentId: string) => {
    setShowCreateDialog(false);
    toast({
      title: "Document created",
      description: "Your document has been created. Now you can add chunks to it.",
    });
    queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    // Optionally, navigate to the document or select it if the layout supports it
    // For now, just invalidating and closing dialog.
    // To select the document, we might need to pass down a selector function or use context.
    // navigate(`/dashboard/knowledge/document/${documentId}/edit`); // Example navigation
  };

  const handleShowImportForm = () => {
    setShowImportForm(true);
  };

  const isKnowledgeBasePage = location.pathname.startsWith("/dashboard/knowledge");
  const isStatsPage = location.pathname === "/dashboard/stats"; // Check if it's the stats page

  const getCurrentTitle = () => {
    const { pathname } = location;

    // Explicitly handle /dashboard/profile first
    if (pathname === "/dashboard/profile") {
      return "Profile";
    }

    // Initialize bestMatchTitle. If current path is /dashboard, it's the initial best match.
    let bestMatchTitle: string | null = null;
    let longestMatchPathLength = 0;

    // Handle the base /dashboard route specifically.
    // This ensures that if the path is exactly /dashboard, it gets precedence or is the starting point.
    if (pathname === "/dashboard") {
      const dashboardItem = menuItems.find(item => item.path === "/dashboard" && item.id === "dashboard");
      bestMatchTitle = dashboardItem ? dashboardItem.title : "Dashboard"; // Default to "Dashboard"
      // Set initial longestMatchPathLength if /dashboard is the current path
      longestMatchPathLength = dashboardItem?.path?.length || "/dashboard".length;
    }
    

    for (const item of menuItems) {
      // Check sub-items first for more specific matches
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (pathname.startsWith(subItem.path)) {
            if (subItem.path.length > longestMatchPathLength) {
              longestMatchPathLength = subItem.path.length;
              bestMatchTitle = subItem.title;
            }
          }
        }
      }

      // Check top-level items
      // Only consider if its path is longer than current longestMatchPathLength
      if (item.path) {
        if (pathname.startsWith(item.path)) {
          if (item.path.length > longestMatchPathLength) {
            longestMatchPathLength = item.path.length;
            bestMatchTitle = item.title;
          }
        }
      }
    }
    
    // If no match was found at all (e.g. an invalid path), default to "Dashboard".
    // Or if /dashboard was the only match and was set initially.
    return bestMatchTitle || "Dashboard";
  };

  const pageTitle = getCurrentTitle();
  // const [activeTab, setActiveTab] = React.useState("overview"); // activeTab state is no longer needed
  // Dummy state for DashboardAnalytics props - replace with actual state management if needed
  // const [timeFilter, setTimeFilter] = React.useState<'today' | 'yesterday' | 'week' | 'month'>('month'); // timeFilter state is no longer needed
  // const [userFilter, setUserFilter] = React.useState('all'); // userFilter state is no longer needed

  return (
    <PageActionProvider>
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeaderContent
            pageTitle={pageTitle}
            isKnowledgeBasePage={isKnowledgeBasePage}
            isStatsPage={isStatsPage} // Pass isStatsPage
            headerActions={headerActions}
            onShowImportForm={handleShowImportForm}
            onShowCreateDialog={() => setShowCreateDialog(true)}
            toggleSidebar={toggleSidebar} // Pass toggleSidebar
            sidebarState={state} // Pass sidebar state
          />
          <main className="flex flex-1 flex-col overflow-auto py-4 pr-4 pl-2 lg:py-6 lg:pr-6 lg:pl-3">
            <Outlet context={{ setHeaderActions } satisfies PageHeaderContextType} />
          </main>
        </div>
        {showImportForm && (
        <ImportDocumentForm
          onCancel={() => setShowImportForm(false)}
          onSuccess={handleImportSuccess}
        />
      )}
      <CreateDocumentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
      </div>
    </PageActionProvider>
  );
}
