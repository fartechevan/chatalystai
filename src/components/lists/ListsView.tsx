
import { useState, useEffect } from "react"; // Keep only one import
import { ContactList } from "./ContactList";
import { CompanyList } from "./CompanyList";
import { LeadsList } from "./LeadsList";
import { SegmentsView } from "./SegmentsView"; // Import SegmentsView
import { ContactDetails } from "./ContactDetails";
import { Button } from "@/components/ui/button";
import { UsersIcon, Building2, Image, Package, Target, PanelLeftClose, PanelLeftOpen, SidebarOpen, ListFilter } from "lucide-react"; // Added icons & ListFilter for segments
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query"; // Added hook import

export function ListsView() {
  const [selectedTab, setSelectedTab] = useState("contacts");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(false); // State for desktop collapse
  const [isMobileListDrawerOpen, setIsMobileListDrawerOpen] = useState(false); // State for mobile drawer
  const isDesktop = useMediaQuery("(min-width: 768px)"); // md breakpoint

  const listItems = [
    { id: "contacts", label: "Contacts", icon: UsersIcon }, // Restored
    { id: "companies", label: "Companies", icon: Building2 }, // Restored
    { id: "leads", label: "Leads", icon: Target },
    { id: "segments", label: "Segments", icon: ListFilter }, // Added Segments tab
    // { id: "all", label: "All Contacts and Companies", icon: Users2 }, // Removed
    { id: "media", label: "Media", icon: Image },
    { id: "products", label: "Products", icon: Package },
  ];

  const handleTabSelect = (tabId: string) => {
    setSelectedTab(tabId);
    setSelectedContactId(null); // Clear selected contact when changing list type
    if (!isDesktop) {
      setIsMobileListDrawerOpen(false); // Close drawer on selection
    }
  };

  const handleCollapseToggle = () => {
    setIsListCollapsed(!isListCollapsed);
  };

  // Extracted Left Panel Content
  const listPanelContent = (
    <div className={cn(
      "border-r bg-muted/30 flex flex-col h-full transition-all duration-300 relative",
      // Width is controlled by parent container (SheetContent or desktop div)
      isDesktop && isListCollapsed ? "items-center" : "" // Center icons when collapsed
    )}>
      <div className={cn("p-4 border-b", isDesktop && isListCollapsed ? "px-2" : "")}>
        <h2 className={cn(
          "font-semibold text-lg", 
          isDesktop && isListCollapsed ? "hidden" : "" // Hide title when collapsed
        )}>
          Lists
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className={cn("p-3 space-y-1", isDesktop && isListCollapsed ? "px-1.5" : "")}>
          {listItems.map((item) => (
            <Button
              key={item.id}
              variant={selectedTab === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 h-10",
                selectedTab === item.id && "bg-muted font-medium",
                isDesktop && isListCollapsed ? "px-2 justify-center" : "" // Adjust padding/alignment when collapsed
              )}
              onClick={() => handleTabSelect(item.id)}
              title={item.label} // Add title for collapsed view
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {/* Hide label when collapsed on desktop */}
              <span className={cn(isDesktop && isListCollapsed ? "hidden" : "")}>{item.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
      {/* Desktop Collapse Button */}
      {isDesktop && (
         <button
            onClick={handleCollapseToggle}
            className={cn(
              "absolute -right-3 top-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent",
              "transition-transform"
            )}
            title={isListCollapsed ? 'Expand list types' : 'Collapse list types'}
          >
            {isListCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" /> 
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
      )}
    </div>
  );


  return (
    // Use h-full, remove negative margins
    <div className="h-full w-full flex flex-col relative"> 
      <div className="flex-1 flex min-h-0"> {/* Ensure flex container takes height */}
        
        {/* Mobile Drawer Trigger */}
        <div className="md:hidden p-2 border-r"> {/* Add border to match desktop */}
          <Sheet open={isMobileListDrawerOpen} onOpenChange={setIsMobileListDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <SidebarOpen className="h-5 w-5" />
                <span className="sr-only">Open Lists Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60"> {/* Adjust width */}
              {listPanelContent}
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Left Panel */}
        <div className={cn(
          "hidden md:flex", // Show only on md+
          isListCollapsed ? "w-16" : "w-64", // Control width based on state
          "transition-all duration-300"
        )}>
          {listPanelContent}
        </div>

        {/* Main Content & Details Panel */}
        <div className="flex-1 flex min-w-0"> {/* Added min-w-0 */}
          
          {/* Conditional Rendering for Mobile vs Desktop */}
          {isDesktop ? (
            // --- Desktop View ---
            <>
              {/* Middle Panel (List Content) */}
              <div className="flex-1 flex flex-col overflow-auto"> 
                {selectedTab === "contacts" && <ContactList onSelectContact={setSelectedContactId} />}
                {selectedTab === "companies" && <CompanyList />}
                {selectedTab === "leads" && <LeadsList />}
                {selectedTab === "segments" && <SegmentsView />} {/* Render SegmentsView */}
                {selectedTab === "media" && <div className="p-4">Media Content Placeholder</div>}
                {selectedTab === "products" && <div className="p-4">Products Content Placeholder</div>}
              </div>

              {/* Right Details Panel (Only show for contacts tab for now) */}
              {isDesktop && selectedTab === "contacts" && selectedContactId && ( // Corrected conditional logic
                <div className="w-96 border-l flex-shrink-0 overflow-auto"> {/* Added overflow-auto */}
                  <ContactDetails
                    contactId={selectedContactId}
                    // No onClose needed for desktop
                  />
                </div>
              )}
            </>
          ) : (
            // --- Mobile View ---
            <>
              {selectedContactId ? (
                // Show Details Panel only
                <div className="flex-1 flex flex-col overflow-auto">
                   <ContactDetails 
                     contactId={selectedContactId} 
                     onCloseDetails={() => setSelectedContactId(null)} // Pass handler
                   />
                </div>
              ) : (
                // Show List Panel only
                <div className="flex-1 flex flex-col overflow-auto">
                  {selectedTab === "contacts" && <ContactList onSelectContact={setSelectedContactId} />}
                  {selectedTab === "companies" && <CompanyList />}
                  {selectedTab === "leads" && <LeadsList />}
                  {selectedTab === "segments" && <SegmentsView />} {/* Render SegmentsView */}
                  {selectedTab === "media" && <div className="p-4">Media Content Placeholder</div>}
                  {selectedTab === "products" && <div className="p-4">Products Content Placeholder</div>}
                </div>
              )}
            </>
          )}
        </div> {/* End Main Content & Details Panel */}
      </div>
    </div>
  );
}
