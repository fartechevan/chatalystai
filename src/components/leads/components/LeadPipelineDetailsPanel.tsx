import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, LinkIcon, Trash2, Tag, Building, User } from 'lucide-react'; // Keep original icons + add new ones
import { Badge } from "@/components/ui/badge";
import type { Lead, Profile, Customer } from "@/components/dashboard/conversations/types"; // Import Customer type
import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Import only the necessary reusable components and hooks
import { 
  LeadTags,
  PipelineSelector,
  LeadContactInfo,
  LeadDetailsInfo
} from "@/components/dashboard/conversations/leadDetails"; 
import {
  useLeadPipeline,
  useLeadTags,
  useAssignee
} from "@/components/dashboard/conversations/leadDetails/hooks"; 
import { calculateDaysSinceCreation } from "@/components/dashboard/conversations/leadDetails/hooks/utils/leadUtils"; // Import utility

interface LeadPipelineDetailsPanelProps {
  lead: Lead | null;
  onClose: () => void;
  queryClient: QueryClient;
}

export function LeadPipelineDetailsPanel({ lead: initialLead, onClose, queryClient }: LeadPipelineDetailsPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true); // Add loading state for profiles
  // Restore customer state and loading state
  const [customer, setCustomer] = useState<Customer | null>(null); 
  const [isLoadingCustomer, setIsLoadingCustomer] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState("main");
  
  // --- Reusable Hooks (excluding useLeadData) ---
  const {
    selectedAssignee,
    handleAssigneeChange,
    fetchProfiles
  } = useAssignee(profiles, initialLead, customer); // Pass customer state

  // Use useLeadPipeline hook
  const {
    allPipelines,
    selectedPipeline,
    selectedStage,
    handlePipelineChange,
    handleStageChange
  } = useLeadPipeline(initialLead, null, true); // Pass initialLead, null for conversation
  
  // Use useLeadTags hook
  const {
    tags,
    setTags,
    isTagsLoading,
    handleAddTag,
    handleRemoveTag
  } = useLeadTags(initialLead); // Pass initialLead

  // --- Data Fetching (Profiles & Customer) ---
  useEffect(() => {
    const getProfiles = async () => {
      setIsLoadingProfiles(true); // Set loading true before fetch
      try {
        const profilesData = await fetchProfiles();
        setProfiles(profilesData as Profile[]); 
      } catch (error) {
        console.error("Error fetching profiles:", error); // Keep error log
        setProfiles([]); // Set empty on error
      } finally {
        setIsLoadingProfiles(false); // Set loading false after fetch/error
      }
    };
    if (initialLead) { 
      getProfiles();
    } else {
      setProfiles([]); 
    }
  }, [fetchProfiles, initialLead]); 

  // Restore customer fetching useEffect
  useEffect(() => {
    const fetchCustomerData = async () => {
      // Explicitly reset state if no valid ID before starting
      if (!initialLead || !initialLead.customer_id) {
        setCustomer(null); 
        setIsLoadingCustomer(false); 
        return;
      }
      
      // Set loading true and ensure customer is null before fetch starts
      setCustomer(null); 
      setIsLoadingCustomer(true); 
      
      try {
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', initialLead.customer_id)
          .single();
        
        if (error) {
          console.error("Error fetching customer:", error); 
          setCustomer(null);
        } else {
          setCustomer(customerData);
        }
      } catch (err) {
        console.error("Error fetching customer:", err); 
        setCustomer(null);
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    fetchCustomerData();
    // Add initialLead.id explicitly to dependency array
  }, [initialLead?.id, initialLead]); 

  // --- Render Logic ---
  if (!initialLead) { 
    return null; 
  }

  const daysSinceCreation = calculateDaysSinceCreation(initialLead.created_at);
  // Remove combined loading state - let children handle their own
  // const isLoading = isLoadingCustomer || isTagsLoading || isLoadingProfiles; 

  return (
    <div className={cn("border-l bg-background flex flex-col h-full")}> 
      {/* Reinstate original CardHeader */}
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg font-semibold">
          {/* Restore customer name logic in title */}
          {customer?.name || initialLead?.name || 'Lead Details'} 
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>

      {/* Remove top-level loading check - render structure directly */}
      <div className="flex-1 overflow-auto flex flex-col"> 
        <> 
          <div className="p-4 space-y-4">
            {/* Pass isTagsLoading to LeadTags */}
            <LeadTags 
              tags={tags} 
              setTags={setTags} 
              onAddTag={handleAddTag} 
              onRemoveTag={handleRemoveTag}
              isLoading={isTagsLoading} 
            />
            {/* Correct PipelineSelector usage */}
            <PipelineSelector 
              selectedPipeline={selectedPipeline}
              selectedStage={selectedStage}
              allPipelines={allPipelines}
              daysSinceCreation={daysSinceCreation}
              onPipelineChange={handlePipelineChange}
              onStageChange={handleStageChange}
            />
          </div>
            
          <Tabs defaultValue="main" className="w-full flex flex-col flex-1" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-t border-b">
                <TabsList className="w-full h-auto grid grid-cols-4 rounded-none bg-background p-0">
                  <TabsTrigger value="main" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Main</TabsTrigger>
                  <TabsTrigger value="statistics" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Statistics</TabsTrigger>
                  <TabsTrigger value="media" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Media</TabsTrigger>
                  <TabsTrigger value="setup" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Setup</TabsTrigger>
                </TabsList>
              </div>

              {/* Let TabsContent handle scrolling directly */}
              <TabsContent value="main" className="flex-1 overflow-auto p-0 m-0 flex flex-col"> 
                {/* Remove inner scrollable div */}
                {/* <div className="flex-1 overflow-auto">  */}
                  <LeadContactInfo 
                    customer={customer} // Restore customer prop
                    lead={initialLead} // Pass initialLead
                    isLoadingCustomer={isLoadingCustomer} // Restore isLoadingCustomer prop
                  />
                  <LeadDetailsInfo 
                    profiles={profiles}
                    selectedAssignee={selectedAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    customer={customer} // Restore customer prop
                    lead={initialLead} // Pass initialLead
                    isLoading={isLoadingProfiles} // Pass profile loading state
                  />
                {/* </div> */}
                {/* Remove the fixed footer section */}
                {/* <div className="mt-auto border-t p-4"> 
                  <div className="flex items-center justify-end gap-2"> 
                    <Button variant="outline" size="icon" className="shrink-0" disabled>
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div> */}
              </TabsContent>

              {/* Remove placeholder tabs */}
              {/* <TabsContent value="statistics" className="flex-1 p-4 m-0 flex flex-col">
                 <p className="text-sm text-muted-foreground">Statistics (Not Implemented)</p>
              </TabsContent>
              <TabsContent value="media" className="flex-1 p-4 m-0 flex flex-col">
                 <p className="text-sm text-muted-foreground">Media (Not Implemented)</p>
              </TabsContent>
              <TabsContent value="setup" className="flex-1 p-4 m-0 flex flex-col">
                 <p className="text-sm text-muted-foreground">Setup (Not Implemented)</p>
              </TabsContent> */}
            </Tabs>
         </> 
        {/* )} <- This closing parenthesis belongs to the removed isLoading check */}
      </div> 
    </div> 
  );
}
