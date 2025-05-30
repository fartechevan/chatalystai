import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/components/dashboard/conversations/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus, Check, ChevronsUpDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { useToast } from "@/hooks/use-toast";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Pipeline {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}

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
  }[] | null; 
  lead_tags: {
    tags: {
      id: string;
      name: string;
    } | null;
  }[] | null;
};

export function LeadsList() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [pipelinePopoverOpen, setPipelinePopoverOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leadForForm, setLeadForForm] = useState<Lead | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name')
        .order('name');
      if (pipelinesError) throw pipelinesError;
      setAvailablePipelines(pipelinesData || []);

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');
      if (tagsError) throw tagsError;
      setAvailableTags(tagsData || []);

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

        const mappedLeads = (leadsData || []).map((item: FetchedLead) => { 
           const pipelineEntry = item.lead_pipeline?.[0]; 
           const stageName = pipelineEntry?.pipeline_stages?.name ?? 'Unassigned';
           const pipelineId = pipelineEntry?.pipeline_id ?? null; 
           const tags = item.lead_tags
             ?.map((lt: { tags: Tag | null } | null) => lt?.tags) 
             .filter((tag): tag is Tag => tag !== null) || []; // Ensure it's an array, not null

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
         } as Lead;
       });
       setAllLeads(mappedLeads);
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
  }, []);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    applyFilters(allLeads, selectedPipelineId, selectedTagIds);
  }, [selectedPipelineId, selectedTagIds, allLeads]);

  const handleAddLead = () => {
    setLeadForForm(null);
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
    toast({ title: "View Details", description: `Details for ${lead.name || lead.company_name} logged to console.` });
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    try {
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .delete()
        .eq('lead_id', leadToDelete.id);
      if (pipelineError) throw pipelineError;

       const { error: tagsError } = await supabase
         .from('lead_tags')
         .delete()
         .eq('lead_id', leadToDelete.id);
       if (tagsError) console.warn("Error deleting lead tags:", tagsError.message); 

      const { error: leadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete.id);
      if (leadError) throw leadError;

      toast({ title: "Lead Deleted", description: `${leadToDelete.name || leadToDelete.company_name} has been deleted.` });
      fetchData(); 
    } catch (error: unknown) {
      console.error("Error deleting lead:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error Deleting Lead", description: message, variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setLeadToDelete(null);
    }
  };

  const selectedTagObjects = availableTags.filter(tag => selectedTagIds?.includes(tag.id));

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold mr-2 flex-shrink-0">Leads</h1>
          <Input
            placeholder="Search leads..."
            className="w-full sm:w-[200px] h-9 text-sm"
          />
          <Popover open={pipelinePopoverOpen} onOpenChange={setPipelinePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={pipelinePopoverOpen} className="w-full sm:w-[180px] justify-between h-9 text-sm px-3">
                {selectedPipelineId ? availablePipelines.find((p) => p.id === selectedPipelineId)?.name : "Select Pipeline"}
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
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={tagPopoverOpen} className="w-full sm:w-[180px] justify-between h-9 text-sm px-3">
                 <span className="truncate">{selectedTagObjects.length > 0 ? `${selectedTagObjects.length} tag${selectedTagObjects.length > 1 ? 's' : ''} selected` : "Filter by tags"}</span>
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
           <div className="flex gap-1.5 flex-wrap items-center flex-grow min-w-0 mt-2 sm:mt-0">
             {selectedTagObjects.map(tag => (
               <Badge key={tag.id} variant="outline" className="flex items-center gap-1 text-xs h-6 px-2">
                 <span className="truncate">{tag.name}</span>
                 <Button variant="ghost" size="icon" className="h-3.5 w-3.5 p-0 ml-0.5 hover:bg-destructive/20 rounded-full" onClick={() => { const newSelectedIds = selectedTagIds?.filter(id => id !== tag.id) ?? []; setSelectedTagIds(newSelectedIds.length > 0 ? newSelectedIds : null); }} title={`Remove tag ${tag.name}`}>
                   <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                 </Button>
               </Badge>
             ))}
           </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredLeads.length} leads`}
          </span>
          <Button size="sm" className="h-9" onClick={handleAddLead}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="h-12 px-3 text-left align-middle w-12"><Checkbox /></TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">NAME</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">COMPANY</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">STAGE</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">PHONE</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">EMAIL</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">TAGS</TableHead>
                <TableHead className="h-12 px-3 text-right align-middle font-medium text-muted-foreground w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="p-3 align-middle text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                 <TableRow><TableCell colSpan={8} className="h-24 text-center p-4 align-middle text-destructive">{error}</TableCell></TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center p-4 align-middle text-muted-foreground">No leads found matching filters.</TableCell></TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50">
                    <TableCell className="p-3 align-middle"><Checkbox /></TableCell>
                    <TableCell className="p-3 align-middle font-medium">{lead.name}</TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">{lead.company_name}</TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground"><Badge variant="outline" className="font-normal text-xs">{lead.stage_name}</Badge></TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">{lead.contact_phone}</TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">{lead.contact_email}</TableCell>
                    <TableCell className="p-3 align-middle">
                      <div className="flex gap-1 flex-wrap">
                        {lead.tags?.map(tag => (
                          <Badge key={tag.id} variant="secondary" className="font-normal text-xs">{tag.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="p-3 align-middle text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <LeadFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        leadToEdit={leadForForm}
        pipelineStageId={null} 
        onLeadAdded={fetchData}
        onLeadUpdated={fetchData}
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
