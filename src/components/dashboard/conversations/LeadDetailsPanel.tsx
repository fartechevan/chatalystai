
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Link as LinkIcon, Check, Trash2, Phone, Mail, Building, ChevronDown, Globe, MapPin, Tag, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Pipeline, PipelineStage, Customer, Lead, Conversation } from "./types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { fetchLeadById } from "./api/conversationsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface LeadDetailsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedConversation: Conversation | null;
}

export function LeadDetailsPanel({ isExpanded, onToggle, selectedConversation }: LeadDetailsPanelProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [daysSinceCreation, setDaysSinceCreation] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [isChangingPipeline, setIsChangingPipeline] = useState(false);

  // Function to format the lead ID without any prefix
  const getFormattedLeadId = (id?: string | null) => {
    if (!id) return '163674';
    // Just return the ID or its first 6 characters if it's long
    return id.length > 6 ? id.slice(0, 6) : id;
  };

  // Fetch all pipelines and their stages
  useEffect(() => {
    async function fetchAllPipelines() {
      try {
        const { data: pipelinesData, error: pipelinesError } = await supabase
          .from('pipelines')
          .select('*')
          .order('name');
        
        if (pipelinesError) {
          console.error('Error fetching all pipelines:', pipelinesError);
          return;
        }
        
        if (pipelinesData && pipelinesData.length > 0) {
          // Fetch stages for each pipeline
          const pipelinesWithStages = await Promise.all(
            pipelinesData.map(async (pipeline) => {
              const { data: stagesData, error: stagesError } = await supabase
                .from('pipeline_stages')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .order('position');
              
              if (stagesError) {
                console.error(`Error fetching stages for pipeline ${pipeline.id}:`, stagesError);
                return { ...pipeline, stages: [] };
              }
              
              return { ...pipeline, stages: stagesData || [] };
            })
          );
          
          setAllPipelines(pipelinesWithStages);
          
          // Set default pipeline (the one marked as default or the first one)
          const defaultPipeline = pipelinesWithStages.find(p => p.is_default) || pipelinesWithStages[0];
          setPipelines(pipelinesWithStages);
          setSelectedPipeline(defaultPipeline);
        }
      } catch (error) {
        console.error('Error fetching pipelines:', error);
      }
    }
    
    if (isExpanded) {
      fetchAllPipelines();
    }
  }, [isExpanded]);

  // Fetch profiles
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) {
          console.error('Error fetching profiles:', error);
        } else if (data) {
          setProfiles(data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (isExpanded) {
      fetchProfiles();
    }
  }, [isExpanded]);

  // Fetch lead data based on the selected conversation
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        if (selectedConversation) {
          // Try to get the lead directly from the conversation
          if (selectedConversation.lead) {
            // Lead is already included in the conversation
            handleLeadData(selectedConversation.lead);
          } else if (selectedConversation.lead_id) {
            // Fetch lead by its ID
            const leadData = await fetchLeadById(selectedConversation.lead_id);
            if (leadData) {
              handleLeadData(leadData);
            } else {
              createMockLeadFromConversation();
            }
          } else {
            // If there's no lead_id, try to find a customer in the conversation
            const customerId = selectedConversation.sender_type === 'customer' 
              ? selectedConversation.sender_id 
              : selectedConversation.receiver_type === 'customer' 
                ? selectedConversation.receiver_id 
                : null;
            
            if (customerId) {
              await handleCustomerId(customerId);
            } else {
              // If no customer or lead, create mock data
              createMockLeadAndCustomer();
            }
          }
        } else {
          // No conversation selected, show mock data
          createMockLeadAndCustomer();
        }
      } catch (error) {
        console.error('Error:', error);
        createMockLeadAndCustomer();
      } finally {
        setIsLoading(false);
      }
    }

    // Process lead data after it's fetched
    function handleLeadData(leadData: Lead) {
      setLead(leadData);
      setTags(['lead', 'follow-up']);
      calculateDaysSinceCreation(leadData.created_at);
      
      // Set the responsible user from the lead's user_id
      if (leadData.user_id) {
        setSelectedAssignee(leadData.user_id);
      }
      
      // If lead has a pipeline_stage_id, find and select the stage
      if (leadData.pipeline_stage_id) {
        findAndSelectStage(leadData.pipeline_stage_id);
      } else if (selectedPipeline?.stages && selectedPipeline.stages.length > 0) {
        // Default to first stage if no stage is selected
        setSelectedStage(selectedPipeline.stages[0]);
      }
      
      // If lead has customer_id, fetch the customer data
      if (leadData.customer_id) {
        fetchCustomerById(leadData.customer_id);
      }
    }
    
    // Find the stage across all pipelines and select it and its parent pipeline
    async function findAndSelectStage(stageId: string) {
      // If we already have all pipelines loaded, search through them
      if (allPipelines.length > 0) {
        for (const pipeline of allPipelines) {
          const stage = pipeline.stages?.find(s => s.id === stageId);
          if (stage) {
            setSelectedPipeline(pipeline);
            setSelectedStage(stage);
            return;
          }
        }
      }
      
      // If not found or pipelines not loaded yet, fetch directly
      try {
        const { data: stageData, error: stageError } = await supabase
          .from('pipeline_stages')
          .select('*, pipeline:pipeline_id(*)')
          .eq('id', stageId)
          .maybeSingle();
        
        if (stageError) {
          console.error('Error fetching stage:', stageError);
          return;
        }
        
        if (stageData) {
          // Set the selected stage
          setSelectedStage(stageData);
          
          // Now get all stages for this pipeline
          const { data: stagesData, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', stageData.pipeline_id)
            .order('position');
          
          if (stagesError) {
            console.error('Error fetching pipeline stages:', stagesError);
            return;
          }
          
          if (stageData.pipeline && stagesData) {
            const pipelineWithStages: Pipeline = {
              ...stageData.pipeline,
              stages: stagesData
            };
            
            // Update selected pipeline
            setSelectedPipeline(pipelineWithStages);
            
            // Also update the allPipelines state if this pipeline isn't there
            setAllPipelines(prev => {
              const exists = prev.some(p => p.id === pipelineWithStages.id);
              if (!exists) {
                return [...prev, pipelineWithStages];
              }
              
              // If it exists but doesn't have stages, update it
              return prev.map(p => p.id === pipelineWithStages.id ? pipelineWithStages : p);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stage and pipeline:', error);
      }
    }
    
    async function handleCustomerId(customerId: string) {
      // Fetch customer data
      const customerData = await fetchCustomerById(customerId);
      
      if (customerData) {
        // Check if there's a lead associated with this customer
        const { data, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('customer_id', customerId)
          .maybeSingle();
        
        if (leadError) {
          console.error('Error fetching lead:', leadError);
        } else if (data) {
          // Create our leadData object from the database result
          const leadData: Lead = {
            id: data.id,
            name: data.name,
            created_at: data.created_at,
            updated_at: data.updated_at,
            user_id: data.user_id,
            pipeline_stage_id: data.pipeline_stage_id,
            customer_id: data.customer_id,
            value: data.value,
            company_name: data.company_name,
            company_address: data.company_address,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            contact_first_name: data.contact_first_name
          };
          
          handleLeadData(leadData);
        } else {
          // No lead exists, create a fake one for demo purposes
          createFakeLeadFromCustomer(customerData);
        }
      } else {
        createMockLeadAndCustomer();
      }
    }
    
    async function fetchCustomerById(customerId: string): Promise<Customer | null> {
      if (!customerId) return null;
      
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();
      
      if (customerError) {
        console.error('Error fetching customer:', customerError);
        return null;
      } 
      
      if (customerData) {
        setCustomer(customerData);
        return customerData;
      }
      
      return null;
    }
    
    function createFakeLeadFromCustomer(customerData: Customer) {
      if (!selectedConversation) return;
      
      const fakeLead: Lead = {
        id: `${Date.now().toString().slice(-6)}`,
        name: 'New Product Inquiry',
        created_at: selectedConversation.created_at,
        updated_at: selectedConversation.updated_at,
        customer_id: customerData.id,
        user_id: selectedConversation.sender_id
      };
      
      setLead(fakeLead);
      setTags(['new-lead']);
      calculateDaysSinceCreation(fakeLead.created_at);
    }

    function createMockLeadFromConversation() {
      if (!selectedConversation) return;
      
      // Create a mock customer first
      const mockCustomer: Customer = {
        id: `CUST-${Date.now().toString().slice(-6)}`,
        name: selectedConversation.sender_type === 'customer' 
          ? selectedConversation.sender.name || 'Unknown Customer'
          : selectedConversation.receiver_type === 'customer'
            ? selectedConversation.receiver.name || 'Unknown Customer'
            : 'John Smith',
        phone_number: '+60192698338',
        email: 'customer@example.com'
      };
      
      setCustomer(mockCustomer);
      
      // Then create a mock lead - without the LEAD- prefix
      const mockLead: Lead = {
        id: `${Date.now().toString().slice(-6)}`,
        name: 'New Product Inquiry',
        created_at: selectedConversation.created_at,
        updated_at: selectedConversation.updated_at,
        customer_id: mockCustomer.id,
        user_id: selectedConversation.sender_type === 'profile' 
          ? selectedConversation.sender_id 
          : selectedConversation.receiver_type === 'profile'
            ? selectedConversation.receiver_id
            : 'mock-user-id'
      };
      
      setLead(mockLead);
      setTags(['mock', 'lead']);
      calculateDaysSinceCreation(mockLead.created_at);
    }

    function createMockLeadAndCustomer() {
      const mockCustomer: Customer = {
        id: '123',
        name: 'John Smith',
        phone_number: '+60192698338',
        email: 'john@example.com'
      };
      
      const mockLead: Lead = {
        id: '163674',
        name: 'New Product Inquiry',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        customer_id: mockCustomer.id,
        user_id: 'mock-user-id'
      };
      
      setCustomer(mockCustomer);
      setLead(mockLead);
      setTags(['lead', 'product']);
      calculateDaysSinceCreation(mockLead.created_at);
      
      // Set a default assignee
      if (profiles.length > 0) {
        setSelectedAssignee(profiles[0].id);
      }
    }
    
    function calculateDaysSinceCreation(creationDate: string) {
      const date = new Date(creationDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysSinceCreation(diffDays);
    }

    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, selectedConversation, allPipelines, selectedPipeline]);

  const selectedProfile = profiles.find(profile => profile.id === selectedAssignee);

  // Handle changing pipeline
  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    setSelectedPipeline(pipeline);
    
    // Select first stage by default
    if (pipeline.stages && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0]);
      // If we have a lead, update its stage in the database
      if (lead?.id) {
        handleStageChange(pipeline.stages[0].id);
      }
    }
    
    setIsChangingPipeline(false);
  };

  // Update pipeline stage
  const handleStageChange = async (stageId: string) => {
    if (!lead || !selectedPipeline) return;
    
    const stage = selectedPipeline.stages?.find(s => s.id === stageId);
    if (stage) {
      setSelectedStage(stage);
      
      // Update the lead's stage in the database
      if (lead.id) {
        try {
          const { error } = await supabase
            .from('leads')
            .update({ pipeline_stage_id: stageId })
            .eq('id', lead.id);
          
          if (error) {
            console.error('Error updating lead stage:', error);
            toast({
              title: "Error",
              description: "Failed to update lead stage",
              variant: "destructive"
            });
          } else {
            console.log(`Updated lead ${lead.id} to stage ${stage.name}`);
            // Update the lead object in state
            setLead(prev => {
              if (!prev) return null;
              return {
                ...prev,
                pipeline_stage_id: stageId
              };
            });
            
            toast({
              title: "Success",
              description: `Lead moved to "${stage.name}" stage`,
            });
          }
        } catch (error) {
          console.error('Error:', error);
          toast({
            title: "Error",
            description: "Something went wrong",
            variant: "destructive"
          });
        }
      }
    }
  };
  
  // Handle updating responsible user
  const handleAssigneeChange = async (userId: string) => {
    setSelectedAssignee(userId);
    
    if (!lead || !lead.id) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ user_id: userId })
        .eq('id', lead.id);
      
      if (error) {
        console.error('Error updating lead assignee:', error);
        toast({
          title: "Error",
          description: "Failed to update lead assignee",
          variant: "destructive"
        });
      } else {
        console.log(`Updated lead ${lead.id} assignee to ${userId}`);
        
        // Update the lead object in state
        setLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            user_id: userId
          };
        });
        
        const profileName = profiles.find(p => p.id === userId)?.name || "Selected user";
        toast({
          title: "Success",
          description: `Lead assigned to ${profileName}`,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!newTag.trim() || !lead) return;
    
    const updatedTags = [...tags, newTag.trim()];
    setTags(updatedTags);
    setNewTag("");
    setShowTagInput(false);
    
    // For this demo we're just handling tags in local state
    // In a real app, you might store them in a dedicated tags table
    console.log(`Added tag ${newTag.trim()} to lead ${lead.id}`);
    
    toast({
      title: "Tag added",
      description: `Added "${newTag.trim()}" tag to lead`,
    });
  };
  
  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    // For this demo we're just handling tags in local state
    // In a real app, you would delete from a dedicated tags table
    console.log(`Removed tag ${tagToRemove} from lead ${lead.id}`);
    
    toast({
      title: "Tag removed",
      description: `Removed "${tagToRemove}" tag from lead`,
    });
  };

  return (
    <div className={cn(
      "border-r bg-background transition-all duration-300 flex flex-col",
      isExpanded ? "w-[320px]" : "w-10"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className={cn("font-medium text-sm truncate flex items-center gap-2", !isExpanded && "hidden")}>
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              Lead #{getFormattedLeadId(lead?.id)}
              <MoreHorizontal className="h-4 w-4 ml-auto text-muted-foreground" />
            </>
          )}
        </h3>
        <Button variant="ghost" size="icon" onClick={onToggle} className={isExpanded ? "ml-auto" : ""}>
          {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="p-4 space-y-4">
            {/* Lead ID with connection status */}
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
            
            {/* Tags */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
                    <span>{tag}</span>
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              
              {showTagInput ? (
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tag name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag();
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTagInput(false)} className="h-8 px-2">
                    &times;
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="text-muted-foreground w-full justify-start" onClick={() => setShowTagInput(true)}>
                  <Tag className="h-3.5 w-3.5 mr-2" />
                  Add tag
                </Button>
              )}
            </div>

            {/* Pipeline Selection */}
            <div className="space-y-2">
              {isChangingPipeline ? (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Select Pipeline</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allPipelines.map((pipeline) => (
                      <Card 
                        key={pipeline.id} 
                        className={cn(
                          "p-2 cursor-pointer hover:bg-accent",
                          pipeline.id === selectedPipeline?.id && "border-primary"
                        )}
                        onClick={() => handlePipelineChange(pipeline.id)}
                      >
                        <div className="text-sm font-medium">{pipeline.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {pipeline.stages?.length || 0} stages
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setIsChangingPipeline(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-muted-foreground">Pipeline</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => setIsChangingPipeline(true)}
                    >
                      Change
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{selectedStage?.name || 'Select a stage'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          ({daysSinceCreation} days)
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2">
                      {selectedPipeline?.stages?.map((stage) => (
                        <Card 
                          key={stage.id} 
                          className={cn(
                            "p-2 mb-2 cursor-pointer hover:bg-accent",
                            stage.id === selectedStage?.id && "border-primary"
                          )}
                          onClick={() => handleStageChange(stage.id)}
                        >
                          {stage.name}
                        </Card>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    {selectedPipeline?.stages && selectedStage && (
                      <div 
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${(
                            ((selectedPipeline.stages.findIndex(s => s.id === selectedStage.id) + 1) / 
                            selectedPipeline.stages.length) * 100
                          )}%`
                        }}
                      ></div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <Tabs defaultValue="main" className="w-full">
            <div className="border-t border-b">
              <TabsList className="w-full h-auto grid grid-cols-4 rounded-none bg-background p-0">
                <TabsTrigger value="main" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Main</TabsTrigger>
                <TabsTrigger value="statistics" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Statistics</TabsTrigger>
                <TabsTrigger value="media" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Media</TabsTrigger>
                <TabsTrigger value="setup" className="py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Setup</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="main" className="flex-1 overflow-auto p-0 m-0">
              <div className="p-4 space-y-6">
                {/* Responsible User Section */}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-muted-foreground">Responsible user</label>
                  <div className="text-sm">
                    {isLoading ? (
                      <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <Select 
                        value={selectedAssignee || undefined} 
                        onValueChange={handleAssigneeChange}
                      >
                        <SelectTrigger className="h-auto py-1 px-2 text-sm border-none shadow-none">
                          <SelectValue placeholder="Select user">
                            {selectedProfile?.name || "Select user"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Sale Section */}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-muted-foreground">Sale</label>
                  <div className="text-sm">{lead?.value?.toLocaleString() || 0} RM</div>
                </div>

                {/* Contact Section */}
                <div className="border-t border-b py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80" />
                      <AvatarFallback>{customer?.name?.charAt(0) || 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="font-medium">{customer?.name || lead?.contact_first_name || 'Contact'}</div>
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <Phone className="h-3 w-3 mr-1" />
                        WhatsApp Lite
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Add Contact Button */}
                <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                  <div className="h-8 w-8 rounded-full border flex items-center justify-center mr-3">
                    <Plus className="h-4 w-4" />
                  </div>
                  Add contact
                </Button>

                {/* Add Company Button */}
                <Button variant="ghost" className="w-full justify-start text-muted-foreground border-b pb-6">
                  <div className="h-8 w-8 rounded-full border flex items-center justify-center mr-3">
                    <Plus className="h-4 w-4" />
                  </div>
                  Add company
                </Button>

                {/* Contact Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-muted-foreground">Work phone</label>
                    <div className="text-sm">{lead?.contact_phone || customer?.phone_number || '...'}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-muted-foreground">Work email</label>
                    <div className="text-sm">{lead?.contact_email || customer?.email || '...'}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-muted-foreground">Company</label>
                    <div className="text-sm">{lead?.company_name || '...'}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-muted-foreground">Address</label>
                    <div className="text-sm">{lead?.company_address || '...'}</div>
                  </div>
                </div>

                {/* Cancel Button */}
                <Button variant="link" size="sm" className="text-muted-foreground px-0">
                  cancel
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="statistics" className="flex-1 p-4 m-0">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Statistics will appear here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="flex-1 p-4 m-0">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Media files will appear here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="flex-1 p-4 m-0">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Setup options will appear here</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom Actions */}
          <div className="mt-auto border-t p-4">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
