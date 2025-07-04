import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./components/auth/LoginForm";
// import { LicensedSignupForm } from "./components/auth/LicensedSignupForm"; // No longer needed
// Dashboard component is likely no longer needed here if Main handles the index route
// import Dashboard from "./pages/Dashboard"; 
import Main from "./pages/Main";
import Settings from "./pages/Settings";
import { AuthProvider } from "./components/auth/AuthProvider";
// import { TeamProvider } from "./context/TeamContext"; // Removed TeamProvider
// PageActionProvider is now in DashboardLayout, so remove from here
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SidebarProvider } from "./components/ui/sidebar";
import { ConversationView } from "./components/dashboard/conversations/ConversationView";
import { DashboardLayout } from "./components/dashboard/DashboardLayout"; // Import the new layout
import { ListsView } from "./components/lists/ListsView";
import { TaskBoard } from "./components/lists/TaskBoard";
import Leads from "./pages/Leads"; // Removed Leads import
import ComingSoon from "@/pages/ComingSoon"; // Keep this for placeholder
import { ConversationStatsView } from "./components/dashboard/stats/ConversationStatsView"; // Import the new stats view
import KnowledgeBase from "./pages/KnowledgeBase";
import { ChunkView } from "./components/knowledge/ChunkView";
import Profile from "./pages/Profile";
import BroadcastsPage from "./pages/Broadcasts"; // Import the actual Broadcasts page
import BroadcastDetailsView from "./components/broadcasts/BroadcastDetailsView"; // Import the details view
import AIAgentsPage from "./pages/AIAgents"; // Import the new AI Agents page
// import UsersPage from "./pages/UsersPage"; // Removed UsersPage import
import ContactsPage from "@/pages/ContactsPage"; // Import Contacts page using @ alias
import SegmentsPage from "./pages/SegmentsPage"; // Import Segments page
// import ReplyConfiguration from "./pages/Automation"; // Removed import for Automation/ReplyConfiguration page
// Removed import for BatchSentimentAnalysisLayout as it will be rendered within ConversationStatsView
import ConfirmInvitePage from "./pages/ConfirmInvitePage"; // Import the ConfirmInvitePage

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* <TeamProvider> */}
          <TooltipProvider>
            <SidebarProvider>
              {/* PageActionProvider removed from here, it's inside DashboardLayout */}
              <div className="min-h-screen bg-background">
                <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<LoginForm />} />
                  {/* <Route path="/signup" element={<LicensedSignupForm />} /> */} {/* Removed separate signup route */}
                  <Route path="/auth/confirm-invite" element={<ConfirmInvitePage />} /> {/* Add route for ConfirmInvitePage */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        {/* Use DashboardLayout as the element */}
                        <DashboardLayout /> 
                      </ProtectedRoute>
                    }
                  >
                    {/* Child routes are now rendered inside DashboardLayout's Outlet */}
                    <Route index element={<Main />} /> 
                    <Route path="settings">
                      <Route index element={<Settings />} />
                      <Route path="billing" element={<Settings />} />
                      <Route path="users" element={<Settings />} />
                      {/* <Route path="access-control" element={<Settings />} /> */} {/* Removed Access Control route */}
                      <Route path="integrations" element={<Settings />} />
                      <Route path="database" element={<Settings />} />
                    </Route>
                    <Route path="lists" element={<ListsView />} />
                    <Route path="leads" element={<Leads />} /> {/* Removed Leads route */}
                    <Route path="calendar" element={<TaskBoard />} />
                    <Route path="conversations" element={<ConversationView />} />
                    <Route path="broadcasts" element={<BroadcastsPage />} /> 
                    <Route path="broadcasts/:broadcastId" element={<BroadcastDetailsView />} /> 
                    <Route path="stats" element={<ConversationStatsView />} /> {/* Use the new stats view */}
                    <Route path="help" element={<ComingSoon />} />
                    <Route path="mail" element={<ComingSoon />} />
                    <Route path="knowledge" element={<KnowledgeBase />} />
                    <Route path="ai-agents" element={<AIAgentsPage />} /> {/* Add AI Agents route */}
                    {/* The route path "teams" is kept for now to avoid breaking existing navigation,
                        but it now renders UsersPage. Consider renaming path to "/users" or "/manage-users" later. */}
                    {/* <Route path="teams" element={<UsersPage />} /> */} {/* Removed Teams/Users route */}
                    <Route path="contacts" element={<ContactsPage />} /> {/* Add Contacts route */}
                    <Route path="segments" element={<SegmentsPage />} /> {/* Add Segments route */}
                    {/* <Route path="automation" element={<ReplyConfiguration />} /> */} {/* Removed Automation/ReplyConfiguration route */}
                    {/* Removed Batch Sentiment Analysis route */}
                    <Route path="profile" element={<Profile />} />
                  </Route>
                </Routes>
              </BrowserRouter>
              </div>
            </SidebarProvider>
          </TooltipProvider>
        {/* </TeamProvider> */}
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
