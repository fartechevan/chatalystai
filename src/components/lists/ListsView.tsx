import { useState, useEffect } from "react";
import { ContactList } from "./ContactList";
import { CompanyList } from "./CompanyList";
import { LeadsList } from "./LeadsList";
import { SegmentsView } from "./SegmentsView";
import { ContactDetails } from "./ContactDetails";
import { Button } from "@/components/ui/button";
import { UsersIcon, Building2, Image, Package, Target, PanelLeftClose, PanelLeftOpen, SidebarOpen, ListFilter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ListsView() {
  const [selectedTab, setSelectedTab] = useState("contacts");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isMobileListDrawerOpen, setIsMobileListDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const listItems = [
    { id: "contacts", label: "Contacts", icon: UsersIcon },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "leads", label: "Leads", icon: Target },
    { id: "segments", label: "Segments", icon: ListFilter },
    { id: "media", label: "Media", icon: Image },
    { id: "products", label: "Products", icon: Package },
  ];

  const handleTabSelect = (tabId: string) => {
    setSelectedTab(tabId);
    setSelectedContactId(null); 
    if (!isDesktop) {
      setIsMobileListDrawerOpen(false);
    }
  };

  const handleCollapseToggle = () => {
    setIsListCollapsed(!isListCollapsed);
  };

  const listPanelContent = (
    <div className={cn(
      "border-r bg-background flex flex-col h-full transition-all duration-300 relative",
      isDesktop && isListCollapsed ? "items-center" : "" 
    )}>
      <div className={cn(
        "flex items-center border-b", 
        isDesktop && isListCollapsed ? "h-[57px] justify-center px-2" : "px-4 h-[57px] justify-between"
      )}>
        {! (isDesktop && isListCollapsed) && <span className="font-semibold text-lg">Lists</span>}
        {isDesktop && (
          <Button variant="ghost" size="icon" onClick={handleCollapseToggle} className={cn(isDesktop && isListCollapsed ? "" : "ml-auto")}>
            {isListCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            <span className="sr-only">{isListCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <nav className={cn("px-3 py-2 space-y-1", isDesktop && isListCollapsed ? "px-1.5" : "")}>
          {listItems.map((item) => (
            <Button
              key={item.id}
              variant={selectedTab === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 text-sm h-9",
                isDesktop && isListCollapsed ? "px-0 justify-center" : "px-3" 
              )}
              onClick={() => handleTabSelect(item.id)}
              title={item.label} 
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className={cn(isDesktop && isListCollapsed ? "hidden" : "")}>{item.label}</span>
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col relative"> 
      <div className="flex-1 flex min-h-0">
        <div className="md:hidden p-2 border-r"> 
          <Sheet open={isMobileListDrawerOpen} onOpenChange={setIsMobileListDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <SidebarOpen className="h-5 w-5" />
                <span className="sr-only">Open Lists Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60">
              {listPanelContent}
            </SheetContent>
          </Sheet>
        </div>

        <div className={cn(
          "hidden md:flex", 
          isListCollapsed ? "w-16" : "w-64", 
          "transition-all duration-300"
        )}>
          {listPanelContent}
        </div>

        <div className="flex-1 flex min-w-0 bg-muted/20"> {/* Added background to content area parent */}
          <div className="flex-1 flex flex-col overflow-auto p-4 md:p-6"> {/* Added padding to content area */}
            {isDesktop ? (
              <>
                {selectedTab === "contacts" && <ContactList onSelectContact={setSelectedContactId} />}
                {selectedTab === "companies" && <CompanyList />}
                {selectedTab === "leads" && <LeadsList />}
                {selectedTab === "segments" && <SegmentsView />}
                {selectedTab === "media" && <div className="p-4 bg-background rounded-lg shadow">Media Content Placeholder</div>}
                {selectedTab === "products" && <div className="p-4 bg-background rounded-lg shadow">Products Content Placeholder</div>}
              </>
            ) : (
              <>
                {selectedContactId && selectedTab === "contacts" ? (
                   <ContactDetails 
                     contactId={selectedContactId} 
                     onCloseDetails={() => setSelectedContactId(null)}
                   />
                ) : (
                  <>
                    {selectedTab === "contacts" && <ContactList onSelectContact={setSelectedContactId} />}
                    {selectedTab === "companies" && <CompanyList />}
                    {selectedTab === "leads" && <LeadsList />}
                    {selectedTab === "segments" && <SegmentsView />}
                    {selectedTab === "media" && <div className="p-4 bg-background rounded-lg shadow">Media Content Placeholder</div>}
                    {selectedTab === "products" && <div className="p-4 bg-background rounded-lg shadow">Products Content Placeholder</div>}
                  </>
                )}
              </>
            )}
          </div>

          {isDesktop && selectedTab === "contacts" && selectedContactId && (
            <div className="w-96 border-l flex-shrink-0 overflow-auto bg-background shadow-lg"> {/* Added bg and shadow */}
              <ContactDetails
                contactId={selectedContactId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
