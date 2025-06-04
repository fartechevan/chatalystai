
import React, { useState, useEffect } from "react"; // Added React import
import { useOutletContext, useNavigate } from 'react-router-dom';
import { LeadsSidebar } from "./LeadsSidebar";
import { LeadsContent } from "./LeadsContent";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarOpen, UserPlus, Check, ChevronsUpDown, X } from "lucide-react"; // Added Check, ChevronsUpDown, X
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { PageHeaderContextType } from '@/components/dashboard/DashboardLayout';
import { supabase } from "@/integrations/supabase/client"; // Added supabase
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"; // Added Popover
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // Added Command
import { Badge } from "@/components/ui/badge"; // Added Badge

interface Tag {
  id: string;
  name: string;
}

export function LeadsLayout() {
  const navigate = useNavigate();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // State for tag filtering, moved from LeadsHeader
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [openTagPopover, setOpenTagPopover] = useState(false);

  // Fetch available tags - logic moved from LeadsHeader
  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');

      if (error) {
        console.error("Error fetching tags:", error);
      } else if (data) {
        setAvailableTags(data);
      }
    };
    fetchTags();
  }, []);

  const handleTagSelect = (tagId: string) => {
    const newSelectedIds = selectedTagIds ? [...selectedTagIds] : [];
    const index = newSelectedIds.indexOf(tagId);

    if (index > -1) {
      newSelectedIds.splice(index, 1); // Deselect
    } else {
      newSelectedIds.push(tagId); // Select
    }
    setSelectedTagIds(newSelectedIds.length > 0 ? newSelectedIds : null);
  };
  
  // handleCreateLead is no longer needed here as the button is being removed from header actions
  // const handleCreateLead = () => {
  //   console.log("Create Lead button clicked on Leads Page, navigating to /dashboard/leads/new");
  //   navigate('/dashboard/leads/new'); 
  // };

  const outletContext = useOutletContext<PageHeaderContextType | undefined>();

  useEffect(() => {
    if (outletContext?.setHeaderActions) {
      const selectedTagsForDisplay = availableTags.filter(tag => selectedTagIds?.includes(tag.id));
      const tagFilterElement = (
        <div className="flex items-center gap-2"> {/* Wrapper for filter and badges */}
          <Popover open={openTagPopover} onOpenChange={setOpenTagPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openTagPopover}
                className="w-[220px] justify-between text-sm"
              >
                <span className="truncate">
                  {selectedTagsForDisplay.length > 0 
                    ? `${selectedTagsForDisplay.length} tag${selectedTagsForDisplay.length > 1 ? 's' : ''} selected` 
                    : "Filter by tags..."} 
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleTagSelect(tag.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTagIds?.includes(tag.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="flex gap-1.5 flex-wrap">
            {selectedTagsForDisplay.map(tag => (
              <Badge key={tag.id} variant="outline" className="flex items-center gap-1 text-xs">
                {tag.name}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3.5 w-3.5 p-0 ml-0.5 hover:bg-destructive/20 rounded-full"
                  onClick={() => handleTagSelect(tag.id)}
                  title={`Remove tag ${tag.name}`}
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      );

      const actions = (
        <div className="flex items-center space-x-2">
          {tagFilterElement}
          {/* Create Lead Button removed from here */}
        </div>
      );
      // If tagFilterElement is the only child, we can pass it directly
      // or ensure the div doesn't create unnecessary layout shifts if empty.
      // For now, keeping the div wrapper for consistency if other actions were to be added later.
      // If selectedTagsForDisplay is empty and no other elements are in tagFilterElement's parent div,
      // actions might render an empty div. This is generally fine.
      outletContext.setHeaderActions(actions);
    }
    return () => {
      if (outletContext?.setHeaderActions) {
        outletContext.setHeaderActions(null);
      }
    };
  }, [outletContext, availableTags, selectedTagIds, openTagPopover, navigate]); // Removed handleCreateLead from dependencies, added navigate


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
      <div className="flex-1 flex flex-col">
        {/* Pass selectedTagIds and its updater to LeadsContent */}
        <LeadsContent 
          pipelineId={selectedPipelineId} 
          selectedTagIds={selectedTagIds} 
          onSelectedTagIdsChange={setSelectedTagIds}
          // onAddLeadClick is no longer passed as LeadsHeader is removed from LeadsContent
        />
      </div>
    </div>
  );
}
