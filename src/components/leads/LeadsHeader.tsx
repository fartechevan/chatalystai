
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
    <div className="flex justify-between items-center p-4 border-b gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        
        {/* Tag Filter Popover */}
        <Popover open={openPopover} onOpenChange={setOpenPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openPopover}
              className="w-[200px] justify-between"
            >
              <span className="truncate">
                {selectedTags.length > 0 
                  ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` 
                  : "Filter by tag..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
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
        <div className="flex gap-1 flex-wrap">
          {selectedTags.map(tag => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
              {tag.name}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={() => handleTagSelect(tag.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Add Lead Button */}
      <Button disabled={!selectedPipelineId}> {/* Disable if no pipeline selected */}
        <Plus className="h-4 w-4 mr-2" />
        ADD LEAD
      </Button>
    </div>
  );
}
