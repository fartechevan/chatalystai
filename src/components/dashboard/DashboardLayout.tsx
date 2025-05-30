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

export function DashboardLayout() {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null); // Keep for existing KB actions
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New context consumer for primary page action
  // This needs to be inside the PageActionProvider, so we'll call usePageActionContext within the return statement
  // or wrap a sub-component. For now, let's plan to access it where the button is rendered.

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
    <PageActionProvider> {/* Wrap the entire layout content */}
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
          <HeaderBreadcrumbSlot />
          {/* Conditionally render h1 if no breadcrumb is present, or let breadcrumb handle title */}
          {/* This requires HeaderBreadcrumbSlot to not render if breadcrumbNode is null, which it does. */}
          {/* We also need to access breadcrumbNode here to make the decision. */}
          <ConditionalPageTitle pageTitle={pageTitle} />
          
          <div className="ml-auto flex items-center gap-4 md:gap-2 lg:gap-4">
            <HeaderSettingsSearchInput /> {/* Add the settings search input here */}
            <HeaderSecondaryActionSlot /> {/* Render secondary action slot (e.g., filter input) */}
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
                  <DropdownMenuItem onClick={handleShowImportForm} className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
                    <FilePlus className="h-4 w-4 mr-2" />
                    Create New Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {headerActions}
          </div>
        </header>
          <main className="flex flex-1 flex-col overflow-auto py-4 pr-4 pl-2 lg:py-6 lg:pr-6 lg:pl-3"> {/* MODIFIED PADDING */}
            {/* Outlet is added here to render child routes, passing context */}
            {/* PageActionProvider is now at a higher level */}
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
