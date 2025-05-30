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
    <div className={cn("border-l bg-card flex flex-col h-full shadow-lg")}> {/* Changed bg to card, added shadow */}
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b sticky top-0 bg-card z-10"> {/* Made header sticky */}
        <CardTitle className="text-lg font-semibold truncate"> {/* Added truncate */}
          {customer?.name || initialLead?.name || 'Lead Details'} 
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0"> {/* Ensure button doesn't shrink */}
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>

      <div className="flex-1 overflow-y-auto"> {/* Moved overflow-y-auto here */}
        <div className="p-4 space-y-4"> {/* Outer padding for content below header */}
          <LeadTags 
            tags={tags} 
            setTags={setTags} 
            onAddTag={handleAddTag} 
            onRemoveTag={handleRemoveTag}
            isLoading={isTagsLoading} 
          />
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
          <div className="border-t border-b sticky top-[69px] bg-card z-10"> {/* Made TabsList sticky below header */}
            <TabsList className="w-full h-auto grid grid-cols-2 sm:grid-cols-4 rounded-none bg-card p-0"> {/* Adjusted grid for responsiveness */}
              <TabsTrigger value="main" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:text-primary">Main</TabsTrigger>
              <TabsTrigger value="statistics" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Statistics</TabsTrigger>
              <TabsTrigger value="media" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none sm:block hidden">Media</TabsTrigger> {/* Hide on small screens */}
              <TabsTrigger value="setup" disabled className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none sm:block hidden">Setup</TabsTrigger> {/* Hide on small screens */}
            </TabsList>
          </div>

          <TabsContent value="main" className="flex-1 p-0 m-0 flex flex-col"> {/* Removed overflow-auto, parent handles it */}
            {/* Content now flows directly, padding handled by children or a wrapper if needed */}
            <LeadContactInfo 
              customer={customer} 
              lead={initialLead} 
              isLoadingCustomer={isLoadingCustomer} 
            />
            <LeadDetailsInfo 
              profiles={profiles}
              selectedAssignee={selectedAssignee}
              onAssigneeChange={handleAssigneeChange}
              customer={customer} 
              lead={initialLead} 
              isLoading={isLoadingProfiles} 
            />
          </TabsContent>
          {/* Placeholder TabsContent can be added back if needed, ensure they also don't have conflicting scroll containers */}
        </Tabs>
      </div> 
    </div> 
  );
}
