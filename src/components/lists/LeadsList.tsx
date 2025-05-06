import React, { useState, useEffect, useCallback } from "react"; // Import hooks
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import type { Lead } from "@/components/dashboard/conversations/types"; // Import Lead type
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge"; // Import Badge for status
// Imports for Filters
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog"; // Import the dialog
import { useToast } from "@/hooks/use-toast"; // Import useToast
// Import Alert Dialog components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Interface for fetched filter data
interface Pipeline {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}

// Define the shape of the data we expect from Supabase, including relations
// Note: Adjusted lead_pipeline to expect an object, not array, if fetching via leads.*
type FetchedLead = Lead & {
  customers: {
    name: string | null;
    company_name: string | null;
    email: string | null;
    phone_number: string | null;
  } | null;
  lead_pipeline: { 
    pipeline_id: string | null; 
    pipeline_stages: {
      name: string | null;
    } | null;
  }[] | null; // Correctly typed as an array or null
  lead_tags: {
    tags: {
      id: string;
      name: string;
    } | null;
  }[] | null;
};


export function LeadsList() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // Store all fetched leads
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]); // Store leads after filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast(); // For delete/edit feedback

  // State for filters
  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [pipelinePopoverOpen, setPipelinePopoverOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // State for the form dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leadForForm, setLeadForForm] = useState<Lead | null>(null); // null for add, Lead object for edit

  // State for delete confirmation dialog
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);


  // Function to refetch leads data (encapsulated)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name')
        .order('name');
      if (pipelinesError) throw pipelinesError;
      setAvailablePipelines(pipelinesData || []);

      // Fetch Tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');
      if (tagsError) throw tagsError;
      setAvailableTags(tagsData || []);

      // Fetch Leads (adjust select based on actual relations/views)
      // This query assumes a view or function might be better for combining lead+pipeline+stage info
      // Or adjust based on how lead_pipeline is structured (is it one-to-one?)
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          *,
          customers (name, company_name, email, phone_number),
          lead_pipeline!inner ( pipeline_id, pipeline_stages (name) ), 
          lead_tags ( tags (id, name) )
        `)
        .order('created_at', { ascending: false });
        if (leadsError) throw leadsError;

        // Map the fetched data using the FetchedLead type
        const mappedLeads = (leadsData || []).map((item: FetchedLead) => {
           // Access the first element of the lead_pipeline array
           const pipelineEntry = item.lead_pipeline?.[0]; 
           const stageName = pipelineEntry?.pipeline_stages?.name ?? 'Unassigned';
           const pipelineId = pipelineEntry?.pipeline_id ?? null; 
           const tags = item.lead_tags
             ?.map(lt => lt.tags) // lt is { tags: Tag | null } | null
             .filter((tag): tag is Tag => tag !== null) || null; // Ensure tag is not null

           return {
           id: item.id,
           created_at: item.created_at,
           updated_at: item.updated_at,
           customer_id: item.customer_id,
           value: item.value,
           pipeline_stage_id: item.pipeline_stage_id,
           user_id: item.user_id,
           assignee_id: item.assignee_id,
           name: item.customers?.name ?? 'N/A',
           company_name: item.customers?.company_name ?? 'N/A',
           contact_email: item.customers?.email ?? 'N/A',
           contact_phone: item.customers?.phone_number ?? 'N/A',
           stage_name: stageName,
           tags: tags,
           pipeline_id: pipelineId,
         } as Lead; // Assert as Lead type
       });
       setAllLeads(mappedLeads);
       // Apply filters immediately after fetching all leads
       applyFilters(mappedLeads, selectedPipelineId, selectedTagIds);

    } catch (fetchError: unknown) {
       console.error("Error fetching data:", fetchError);
       const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
       setError(`Failed to fetch data: ${errorMessage}`);
       setAllLeads([]);
       setFilteredLeads([]);
    } finally {
       setLoading(false);
    }
  }, [selectedPipelineId, selectedTagIds]); // Include filters in dependency if filtering server-side

  // Extracted filter logic
  const applyFilters = (
      leads: Lead[],
      pipelineId: string | null,
      tagIds: string[] | null
    ) => {
      let leadsToFilter = [...leads];
      if (pipelineId) {
        leadsToFilter = leadsToFilter.filter(lead => lead.pipeline_id === pipelineId);
      }
      if (tagIds && tagIds.length > 0) {
        leadsToFilter = leadsToFilter.filter(lead =>
          lead.tags?.some(tag => tagIds.includes(tag.id))
        );
      }
      setFilteredLeads(leadsToFilter);
  };


  // Fetch initial data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized with useCallback

  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters(allLeads, selectedPipelineId, selectedTagIds);
  }, [selectedPipelineId, selectedTagIds, allLeads]);


  // --- Handlers ---
  const handleAddLead = () => {
    setLeadForForm(null); // Ensure it's in 'add' mode
    setIsFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setLeadForForm(lead);
    setIsFormOpen(true);
  };

  const handleDeleteLead = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsAlertOpen(true);
  };

  const handleViewDetails = (lead: Lead) => {
    // Placeholder: Log details or implement navigation/panel opening
    console.log("View Details:", lead);
    toast({ title: "View Details", description: `Details for ${lead.name || lead.company_name} logged to console.` });
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;

    try {
      // 1. Delete from lead_pipeline (junction table)
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .delete()
        .eq('lead_id', leadToDelete.id);
      if (pipelineError) throw pipelineError;

      // 2. Delete from lead_tags (junction table)
       const { error: tagsError } = await supabase
         .from('lead_tags')
         .delete()
         .eq('lead_id', leadToDelete.id);
       // Log error but continue, maybe lead had no tags
       if (tagsError) console.warn("Error deleting lead tags:", tagsError.message); 

      // 3. Delete from leads table
      const { error: leadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete.id);
      if (leadError) throw leadError;

      toast({ title: "Lead Deleted", description: `${leadToDelete.name || leadToDelete.company_name} has been deleted.` });
      fetchData(); // Refresh the list

    } catch (error: unknown) {
      console.error("Error deleting lead:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error Deleting Lead", description: message, variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setLeadToDelete(null);
    }
  };


  // Helper to get selected tag names for display
  const selectedTagObjects = availableTags.filter(tag => selectedTagIds?.includes(tag.id));


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-2">
        {/* Left side: Title, Search, Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-grow min-w-0">
          <h2 className="text-lg font-semibold mr-2 flex-shrink-0">LEADS</h2>
          <Input
            placeholder="Search leads..."
            className="w-full sm:w-[200px] h-8 text-sm" // Responsive width
            // Add onChange handler later for search functionality
          />

          {/* Pipeline Filter */}
          <Popover open={pipelinePopoverOpen} onOpenChange={setPipelinePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={pipelinePopoverOpen} className="w-full sm:w-[180px] justify-between h-8 text-xs px-2">
                {selectedPipelineId ? availablePipelines.find((p) => p.id === selectedPipelineId)?.name : "Select Pipeline..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0">
              <Command>
                <CommandInput placeholder="Search pipeline..." />
                <CommandList>
                  <CommandEmpty>No pipeline found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem key="clear-pipeline" value="clear-pipeline" onSelect={() => { setSelectedPipelineId(null); setPipelinePopoverOpen(false); }}>
                       <Check className={cn("mr-2 h-4 w-4", !selectedPipelineId ? "opacity-100" : "opacity-0")}/> All Pipelines
                    </CommandItem>
                    {availablePipelines.map((pipeline) => (
                      <CommandItem key={pipeline.id} value={pipeline.name} onSelect={(currentValue) => { const newId = availablePipelines.find(p => p.name.toLowerCase() === currentValue)?.id; setSelectedPipelineId(newId || null); setPipelinePopoverOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", selectedPipelineId === pipeline.id ? "opacity-100" : "opacity-0")}/> {pipeline.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Tag Filter */}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={tagPopoverOpen} className="w-full sm:w-[180px] justify-between h-8 text-xs px-2">
                 <span className="truncate">{selectedTagObjects.length > 0 ? `${selectedTagObjects.length} tag${selectedTagObjects.length > 1 ? 's' : ''} selected` : "Filter by tag..."}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem key={tag.id} value={tag.name} onSelect={() => { const newSelectedIds = selectedTagIds ? [...selectedTagIds] : []; const index = newSelectedIds.indexOf(tag.id); if (index > -1) newSelectedIds.splice(index, 1); else newSelectedIds.push(tag.id); setSelectedTagIds(newSelectedIds.length > 0 ? newSelectedIds : null); }}>
                        <Check className={cn("mr-2 h-4 w-4", selectedTagIds?.includes(tag.id) ? "opacity-100" : "opacity-0")}/> {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

           {/* Display selected tags as badges */}
           <div className="flex gap-1 flex-wrap items-center flex-grow min-w-0">
             {selectedTagObjects.map(tag => (
               <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 text-xs h-5 px-1.5 flex-shrink-0">
                 <span className="truncate">{tag.name}</span>
                 <Button variant="ghost" size="icon" className="h-3 w-3 p-0 ml-0.5" onClick={() => { const newSelectedIds = selectedTagIds?.filter(id => id !== tag.id) ?? []; setSelectedTagIds(newSelectedIds.length > 0 ? newSelectedIds : null); }}>
                   <X className="h-2.5 w-2.5" />
                 </Button>
               </Badge>
             ))}
           </div>

          {/* Lead Count - Pushed to the right */}
          <span className="text-sm text-muted-foreground ml-auto flex-shrink-0">
            {loading ? 'Loading...' : `${filteredLeads.length} leads`}
          </span>
        </div>

        {/* Right side: Add Lead Button */}
        {/* Removed Add Lead button as context is unclear in list view */}
        {/* <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" className="h-8" onClick={handleAddLead}>
            <Plus className="h-4 w-4 mr-2" />
            ADD LEAD
          </Button>
        </div> */}
      </div>

      {/* Table Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <table className="w-full text-sm"> {/* Base text size */}
            <thead className="sticky top-0 bg-background border-b z-10">
              <tr>
                <th className="w-12 p-2 text-left"><Checkbox /></th>
                <th className="p-2 text-left font-medium text-muted-foreground">NAME</th>
                <th className="p-2 text-left font-medium text-muted-foreground">COMPANY</th>
                <th className="p-2 text-left font-medium text-muted-foreground">STAGE</th>
                <th className="p-2 text-left font-medium text-muted-foreground">PHONE</th>
                <th className="p-2 text-left font-medium text-muted-foreground">EMAIL</th>
                <th className="p-2 text-left font-medium text-muted-foreground">TAGS</th>
                <th className="w-12 p-2 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    <td className="p-2"><Skeleton className="h-4 w-4" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-2"><Skeleton className="h-8 w-8" /></td>
                  </tr>
                ))
              ) : error ? (
                 <tr><td colSpan={8} className="py-8 text-center text-destructive">{error}</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No leads found matching filters.</td></tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/50">
                    <td className="p-2"><Checkbox /></td>
                    <td className="p-2 font-medium">{lead.name}</td>
                    <td className="p-2 text-muted-foreground">{lead.company_name}</td>
                    <td className="p-2 text-muted-foreground"><Badge variant="outline" className="font-normal">{lead.stage_name}</Badge></td>
                    <td className="p-2 text-muted-foreground">{lead.contact_phone}</td>
                    <td className="p-2 text-muted-foreground">{lead.contact_email}</td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap">
                        {lead.tags?.map(tag => (
                          <Badge key={tag.id} variant="secondary" className="font-normal">{tag.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onSelect={() => handleViewDetails(lead)}>View Details</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => handleEditLead(lead)}>Edit Lead</DropdownMenuItem>
                           <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteLead(lead)}>Delete Lead</DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Dialogs */}
      <LeadFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        leadToEdit={leadForForm}
        // Pass null for pipelineStageId when editing from list view, 
        // or determine how to handle adding from list view if re-enabled
        pipelineStageId={null} 
        onLeadAdded={fetchData} // Refresh list after adding
        onLeadUpdated={fetchData} // Refresh list after updating
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead 
              "{leadToDelete?.name || leadToDelete?.company_name}" and remove its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeadToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
