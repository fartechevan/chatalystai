import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./components/auth/LoginForm";
// Dashboard component is likely no longer needed here if Main handles the index route
// import Dashboard from "./pages/Dashboard"; 
import Main from "./pages/Main";
import Settings from "./pages/Settings";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SidebarProvider } from "./components/ui/sidebar";
import { ConversationView } from "./components/dashboard/conversations/ConversationView";
import { DashboardLayout } from "./components/dashboard/DashboardLayout"; // Import the new layout
import { ListsView } from "./components/lists/ListsView";
import { TaskBoard } from "./components/lists/TaskBoard";
import Leads from "./pages/Leads";
import ComingSoon from "@/pages/ComingSoon"; // Keep this for placeholder
import { ConversationStatsView } from "./components/dashboard/stats/ConversationStatsView"; // Import the new stats view
import KnowledgeBase from "./pages/KnowledgeBase";
import { ChunkView } from "./components/knowledge/ChunkView";
import Profile from "./pages/Profile";
import BroadcastsPage from "./pages/Broadcasts"; // Import the actual Broadcasts page
import BroadcastDetailsView from "./components/broadcasts/BroadcastDetailsView"; // Import the details view
import AIAgentsPage from "./pages/AIAgents"; // Import the new AI Agents page
// Removed import for BatchSentimentAnalysisLayout as it will be rendered within ConversationStatsView

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
        <TooltipProvider>
          <SidebarProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<LoginForm />} />
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
                    <Route path="settings" element={<Settings />} />
                    <Route path="lists" element={<ListsView />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="calendar" element={<TaskBoard />} />
                    <Route path="conversations" element={<ConversationView />} />
                    <Route path="broadcasts" element={<BroadcastsPage />} /> 
                    <Route path="broadcasts/:broadcastId" element={<BroadcastDetailsView />} /> 
                    <Route path="stats" element={<ConversationStatsView />} /> {/* Use the new stats view */}
                    <Route path="help" element={<ComingSoon />} />
                    <Route path="mail" element={<ComingSoon />} />
                    <Route path="knowledge" element={<KnowledgeBase />} />
                    <Route path="ai-agents" element={<AIAgentsPage />} /> {/* Add AI Agents route */}
                    {/* Removed Batch Sentiment Analysis route */}
                    <Route path="profile" element={<Profile />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
