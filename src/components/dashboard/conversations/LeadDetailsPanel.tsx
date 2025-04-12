import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Conversation } from "./types";
import { 
  LeadHeader,
  LeadTags,
  PipelineSelector,
  LeadContactInfo,
  LeadTabContent
} from "./leadDetails";
import { EmptyLeadState } from "./leadDetails/EmptyLeadState";
import {
  useLeadData,
  useLeadPipeline,
  useLeadTags,
  useAssignee
} from "./leadDetails/hooks";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient, QueryClient } from "@tanstack/react-query"; // Import QueryClient
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./types"; 

interface LeadDetailsPanelProps {
  // Removed isExpanded, onToggle
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  queryClient: QueryClient; 
  onClose?: () => void; // Keep onClose for mobile drawer closing if needed
}

export function LeadDetailsPanel({
  // Removed isExpanded, onToggle
  selectedConversation,
  setSelectedConversation,
  queryClient,
  onClose, // Keep onClose
}: LeadDetailsPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]); 
  const [activeTab, setActiveTab] = useState("main");
  
  // Custom hooks - Pass true for isExpanded since it's always expanded when rendered now
  const { 
    isLoading, 
    customer, 
    lead, 
    daysSinceCreation, 
    setLead 
  } = useLeadData(true, selectedConversation, profiles); 
  
  const {
    allPipelines,
    selectedPipeline,
    selectedStage,
    handlePipelineChange,
    handleStageChange
  } = useLeadPipeline(lead, selectedConversation, true); // Pass true for isExpanded
  
  const {
    tags,
    setTags,
    isTagsLoading, // Keep this loading state
    handleAddTag,
    handleRemoveTag
  } = useLeadTags(lead);
  
  const {
    selectedAssignee,
    handleAssigneeChange,
    fetchProfiles
  } = useAssignee(profiles, lead);

  // Fetch profiles on mount or when selectedConversation changes
  useEffect(() => {
    const getProfiles = async () => {
      const profilesData = await fetchProfiles();
      setProfiles(profilesData as Profile[]); 
    };
    getProfiles();
    // Dependency array might need adjustment based on fetchProfiles implementation
  }, [fetchProfiles, selectedConversation]); 

  return (
    // Removed width classes (controlled by parent), added h-full
    <div className={cn("border-l bg-background flex flex-col h-full")}> 
      {/* Pass necessary props to LeadHeader, remove isExpanded/onToggle and onClose */}
      <LeadHeader 
        lead={lead} 
        isLoading={isLoading} 
        // Removed onClose prop pass
      />

      {/* Content always rendered now, parent controls visibility */}
      <div className="flex-1 overflow-auto flex flex-col"> 
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-3 w-40 bg-muted rounded"></div>
              </div>
            </div>
          ) : lead ? (
            <>
              <div className="p-4 space-y-4">
                {lead && selectedConversation && (
                  <div className="text-xs text-muted-foreground">
                    {selectedConversation.lead_id === lead.id ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Connected to conversation
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        Not connected to current conversation
                      </span>
                    )}
                  </div>
                )}
                
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
              
              <Tabs defaultValue="main" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                <div className="border-t border-b">
                  <TabsList className="w-full h-auto grid grid-cols-4 rounded-none bg-background p-0">
                    <TabsTrigger value="main" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Main</TabsTrigger>
                    <TabsTrigger value="statistics" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Statistics</TabsTrigger>
                    <TabsTrigger value="media" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Media</TabsTrigger>
                    <TabsTrigger value="setup" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Setup</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="main" className="flex-1 overflow-auto p-0 m-0">
                  <LeadContactInfo 
                    customer={customer} 
                    lead={lead} 
                  />
                  
                  <LeadTabContent 
                    activeTab={activeTab}
                    profiles={profiles}
                    selectedAssignee={selectedAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    customer={customer}
                    lead={lead}
                    isLoading={isLoading}
                  />
                </TabsContent>
                
                <TabsContent value="statistics" className="flex-1 p-4 m-0">
                  <LeadTabContent 
                    activeTab={activeTab}
                    profiles={profiles}
                    selectedAssignee={selectedAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    customer={customer}
                    lead={lead}
                    isLoading={isLoading}
                  />
                </TabsContent>
                
                <TabsContent value="media" className="flex-1 p-4 m-0">
                  <LeadTabContent 
                    activeTab={activeTab}
                    profiles={profiles}
                    selectedAssignee={selectedAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    customer={customer}
                    lead={lead}
                    isLoading={isLoading}
                  />
                </TabsContent>
                
                <TabsContent value="setup" className="flex-1 p-4 m-0">
                  <LeadTabContent 
                    activeTab={activeTab}
                    profiles={profiles}
                    selectedAssignee={selectedAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    customer={customer}
                    lead={lead}
                    isLoading={isLoading}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
             <EmptyLeadState 
               conversationId={selectedConversation?.conversation_id || ''}
               onLeadCreated={async (leadId) => {
                 // console.log("Lead created:", leadId); // Removed log
                 // Invalidate the conversations query to refetch conversations
                 await queryClient.invalidateQueries({ queryKey: ['conversations'] });

                // Fetch the updated conversation data
                const { data: updatedConversation, error } = await supabase
                  .from('conversations')
                  .select('*')
                  .eq('conversation_id', selectedConversation?.conversation_id || '')
                  .single();

                if (error) {
                  console.error("Error fetching updated conversation:", error);
                  return;
                }

                // Update the selected conversation state
                setSelectedConversation(updatedConversation as Conversation);
              }}
            />
          )} {/* End Conditional Rendering: isLoading ? (...) : lead ? (...) : (...) */}
        </div> {/* End Content Area div */}
    </div> /* End Root div */
  );
}
