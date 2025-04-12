
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "./components/auth/LoginForm";
import Dashboard from "./pages/Dashboard";
import Main from "./pages/Main";
import Settings from "./pages/Settings";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SidebarProvider } from "./components/ui/sidebar";
import { ConversationView } from "./components/dashboard/conversations/ConversationView";
import { ListsView } from "./components/lists/ListsView";
import { TaskBoard } from "./components/lists/TaskBoard";
import Leads from "./pages/Leads";
import ComingSoon from "@/pages/ComingSoon"; // Keep this for placeholder
import KnowledgeBase from "./pages/KnowledgeBase";
import { ChunkView } from "./components/knowledge/ChunkView";
import Profile from "./pages/Profile";
import BroadcastsPage from "./pages/Broadcasts"; // Import the actual Broadcasts page
import BroadcastDetailsView from "./components/broadcasts/BroadcastDetailsView"; // Import the details view

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
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Main />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="lists" element={<ListsView />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="calendar" element={<TaskBoard />} />
                    <Route path="conversations" element={<ConversationView />} />
                    {/* Update Broadcasts route and add details route */}
                    <Route path="broadcasts" element={<BroadcastsPage />} /> 
                    <Route path="broadcasts/:broadcastId" element={<BroadcastDetailsView />} /> 
                    <Route path="stats" element={<ComingSoon />} />
                    <Route path="help" element={<ComingSoon />} />
                    <Route path="mail" element={<ComingSoon />} />
                    <Route path="knowledge" element={<KnowledgeBase />} />
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
