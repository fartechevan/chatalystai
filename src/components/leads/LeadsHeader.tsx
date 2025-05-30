
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, ChevronsUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // Assuming you have this utility

interface Tag {
  id: string;
  name: string;
}

interface LeadsHeaderProps {
  selectedPipelineId: string | null;
  selectedTagIds: string[] | null;
  onSelectedTagIdsChange: (ids: string[] | null) => void;
}

export function LeadsHeader({ 
  selectedPipelineId, 
  selectedTagIds, 
  onSelectedTagIdsChange 
}: LeadsHeaderProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [openPopover, setOpenPopover] = useState(false);

  // Fetch available tags
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
    onSelectedTagIdsChange(newSelectedIds.length > 0 ? newSelectedIds : null);
  };

  const selectedTags = availableTags.filter(tag => selectedTagIds?.includes(tag.id));

  return (
    // Use px-6 for more horizontal padding, consistent with typical dashboard page headers
    <div className="flex flex-col sm:flex-row justify-between items-center p-4 sm:px-6 border-b gap-3"> 
      <div className="flex items-center gap-3"> {/* Reduced gap slightly for a tighter look */}
        {/* Consider making the title larger if this is a main page title */}
        <h1 className="text-xl font-semibold">Pipeline</h1> 
        
        {/* Tag Filter Popover */}
        <Popover open={openPopover} onOpenChange={setOpenPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openPopover}
              className="w-[220px] justify-between text-sm" // Increased width slightly, ensured text size
            >
              <span className="truncate">
                {selectedTags.length > 0 
                  ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` 
                  : "Filter by tags..."} 
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0"> {/* Matched width */}
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name} // Use name for search filtering
                      onSelect={() => {
                        handleTagSelect(tag.id);
                        // Keep popover open for multi-select
                        // setOpenPopover(false); 
                      }}
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
        {/* Display selected tags as badges */}
        <div className="flex gap-1.5 flex-wrap"> {/* Slightly increased gap for badges */}
          {selectedTags.map(tag => (
            <Badge key={tag.id} variant="outline" className="flex items-center gap-1 text-xs"> {/* Changed to outline, adjusted text size */}
              {tag.name}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-3.5 w-3.5 p-0 ml-0.5 hover:bg-destructive/20 rounded-full" // Made X button smaller and rounder on hover
                onClick={() => handleTagSelect(tag.id)}
                title={`Remove tag ${tag.name}`}
              >
                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Add Lead Button */}
      {/* On smaller screens, this button might wrap. Consider responsive layout for the header if many items. */}
      <Button disabled={!selectedPipelineId} size="sm"> {/* Standardized button size */}
        <Plus className="h-4 w-4 mr-1.5" /> {/* Adjusted margin */}
        Add Lead
      </Button>
    </div>
  );
}
