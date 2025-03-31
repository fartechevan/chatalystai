
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react"; // Removed TestTubeDiagonal
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "You have been logged out successfully",
      });
      
      navigate("/login");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <DashboardSidebar />
        <main className="flex-1 pt-8 px-8 overflow-auto relative">
          <div className="absolute top-4 right-4 z-50"> {/* Removed flex gap-2 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
