import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { LeadsList } from "@/components/lists/LeadsList";

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
              <Router>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/login" element={<LoginForm />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardSidebar />
                        <main className="flex-1 overflow-y-auto p-8">
                          <Routes>
                            <Route path="" element={<Main />} />
                            <Route path="settings/*" element={<Settings />} />
                            <Route path="lists" element={<ListsView />} />
                            <Route path="leads" element={<LeadsList />} />
                            <Route path="calendar" element={<TaskBoard />} />
                            <Route path="conversations" element={<ConversationView />} />
                          </Routes>
                        </main>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
