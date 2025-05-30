
import { useState, useEffect } from "react";
import { LeadsSidebar } from "./LeadsSidebar";
import { LeadsContent } from "./LeadsContent";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarOpen } from "lucide-react"; // Changed from Menu
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";


export function LeadsLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  // const [isCollapsed, setIsCollapsed] = useState(false); // Removed isCollapsed state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)"); // md breakpoint

  const handlePipelineSelect = (id: string) => {
    setSelectedPipelineId(id);
    if (!isDesktop) {
      setIsMobileDrawerOpen(false); // Close drawer on selection in mobile
    }
  };

  // const handleCollapseToggle = () => { // Removed handleCollapseToggle
  //   setIsCollapsed(!isCollapsed);
  // };

  const sidebarContent = (
    <LeadsSidebar
      selectedPipelineId={selectedPipelineId}
      onPipelineSelect={handlePipelineSelect}
      // isCollapsed prop removed
      // onCollapse prop removed
    />
  );

  return (
    // Use h-full to fill parent height, remove negative margins
    <div className="flex h-full"> 
      {/* Mobile Drawer */}
      <div className="md:hidden p-2"> {/* Container for the trigger button */}
        <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SidebarOpen className="h-5 w-5" /> {/* Changed icon here */}
              <span className="sr-only">Open Pipelines Menu</span>
            </Button>
          </SheetTrigger>
          {/* Added [&>button]:hidden to hide direct button children (like the default close 'X') */}
          <SheetContent side="left" className="p-0 w-60 [&>button]:hidden"> 
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex w-48", // Show only on md and up, fixed width
        // isCollapsed ? "w-16" : "w-48", // Width controlled by collapse state - REMOVED
        "transition-all duration-300" // Transition might not be needed if width is fixed
      )}>
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      {/* Removed overflow-hidden to let child components manage scrolling */}
      <div className="flex-1 flex flex-col">
        <LeadsContent pipelineId={selectedPipelineId} />
      </div>
    </div>
  );
}
