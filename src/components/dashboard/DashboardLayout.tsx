import { Outlet } from "react-router-dom";
import { DashboardSidebar } from "./Sidebar"; // Assuming Sidebar is in the same directory

export function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      {/* Add mobile top padding to main content area */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0"> 
        {/* Child routes will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
}
