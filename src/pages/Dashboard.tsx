
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";

export default function Dashboard() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <DashboardSidebar />
        <main className="flex-1 pt-8 pr8 overflow-auto relative">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
