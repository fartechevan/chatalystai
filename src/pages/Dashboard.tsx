
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Removed LogOut, supabase, toast, useNavigate imports

export default function Dashboard() {
  // Removed handleLogout function

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <DashboardSidebar />
        {/* Removed pt-8 px-8 */}
        <main className="flex-1 overflow-auto relative">
          {/* Removed logout button container */}
          <div>
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
