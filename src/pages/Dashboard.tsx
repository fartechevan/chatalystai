
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";

export default function Dashboard() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto relative">
          <div className="container py-8 px-4 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
