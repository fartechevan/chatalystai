
import { useState, useEffect } from "react"; // Added useEffect
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsContent } from "./SettingsContent";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query"; // Use consistent hook

export function SettingsLayout() {
  const [selectedSection, setSelectedSection] = useState("integrations");
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false); // State for desktop collapse
  const [isMobileSettingsDrawerOpen, setIsMobileSettingsDrawerOpen] = useState(false); // State for mobile drawer
  const isDesktop = useMediaQuery("(min-width: 768px)"); // md breakpoint

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    if (!isDesktop) {
      setIsMobileSettingsDrawerOpen(false); // Close drawer on selection
    }
  };

  const handleCollapseToggle = () => {
    setIsSettingsCollapsed(!isSettingsCollapsed);
  };

  // Extracted Sidebar Content
  const settingsSidebarContent = (
    <SettingsSidebar
      selectedSection={selectedSection}
      onSectionChange={handleSectionChange}
      isCollapsed={isDesktop ? isSettingsCollapsed : false} // Pass collapse state
      onCollapse={handleCollapseToggle} // Pass toggle handler
    />
  );

  return (
    // Use h-full, remove negative margins if they exist from parent
    <div className="flex h-full"> 
      
      {/* Mobile Drawer Trigger */}
      <div className="md:hidden p-2 border-r"> 
        <Sheet open={isMobileSettingsDrawerOpen} onOpenChange={setIsMobileSettingsDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SidebarOpen className="h-5 w-5" />
              <span className="sr-only">Open Settings Menu</span>
            </Button>
          </SheetTrigger>
          {/* Remove default close button using CSS workaround */}
          <SheetContent side="left" className="p-0 w-60 [&>button]:hidden"> 
            {settingsSidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex", // Show only on md+
        isSettingsCollapsed ? "w-16" : "w-64", // Control width based on state
        "transition-all duration-300" // Added transition
      )}>
        {settingsSidebarContent}
      </div>

      {/* Main Content Area - Removed padding again, let SettingsContent/IntegrationsView handle it */}
      <div className="flex-1 flex flex-col overflow-auto"> 
         <SettingsContent section={selectedSection} />
      </div>
    </div>
  );
}
