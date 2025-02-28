
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
import { fetchLeadByConversation } from "./api/conversationsApi";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadDetailsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedConversation: Conversation | null;
}

export function LeadDetailsPanel({ isExpanded, onToggle, selectedConversation }: LeadDetailsPanelProps) {
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
          // Set a default assignee if available
          if (data.length > 0) {
            setSelectedAssignee(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (isExpanded) {
      fetchProfiles();
    }
  }, [isExpanded]);

  // Fetch pipelines and stages
  useEffect(() => {
    async function fetchPipelines() {
      try {
        const { data: pipelinesData, error: pipelinesError } = await supabase
          .from('pipelines')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();
        
        if (pipelinesError) {
          console.error('Error fetching pipelines:', pipelinesError);
        } else if (pipelinesData) {
          // Get stages for the default pipeline
          const { data: stagesData, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipelinesData.id)
            .order('position');
          
          if (stagesError) {
            console.error('Error fetching stages:', stagesError);
          } else if (stagesData) {
            const pipelineWithStages: Pipeline = {
              ...pipelinesData,
              stages: stagesData
            };
            
            setPipelines([pipelineWithStages]);
            setSelectedPipeline(pipelineWithStages);
            
            // Set first stage as default
            if (stagesData.length > 0) {
              setSelectedStage(stagesData[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (isExpanded) {
      fetchPipelines();
    }
  }, [isExpanded]);

  // Fetch lead data based on the selected conversation
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        if (selectedConversation) {
          // First try to get lead from the conversation.lead_id
          let leadData: Lead | null = null;
          
          if (selectedConversation.lead_id) {
            // Directly fetch the lead
            const { data, error } = await supabase
              .from('leads')
              .select('*')
              .eq('id', selectedConversation.lead_id)
              .maybeSingle();
              
            if (error) {
              console.error('Error fetching lead:', error);
            } else if (data) {
              // Safely create a Lead object from the data
              leadData = {
                id: data.id,
                name: data.name,
                created_at: data.created_at,
                updated_at: data.updated_at,
                pipeline_stage_id: data.pipeline_stage_id || null,
                customer_id: data.customer_id || null,
                user_id: data.user_id,
                value: data.value || null,
                company_name: data.company_name || null,
                company_address: data.company_address || null,
                contact_email: data.contact_email || null,
                contact_phone: data.contact_phone || null,
                contact_first_name: data.contact_first_name || null
              };
            }
          } else {
            // If there's no lead_id, try to find a customer in the conversation
            const customerId = selectedConversation.sender_type === 'customer' 
              ? selectedConversation.sender_id 
              : selectedConversation.receiver_type === 'customer' 
                ? selectedConversation.receiver_id 
                : null;
            
            if (customerId) {
              // Fetch customer data
              const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .maybeSingle();
              
              if (customerError) {
                console.error('Error fetching customer:', customerError);
              } else if (customerData) {
                setCustomer(customerData);
                
                // Check if there's a lead associated with this customer
                const { data, error: leadError } = await supabase
                  .from('leads')
                  .select('*')
                  .eq('customer_id', customerId)
                  .maybeSingle();
                
                if (leadError) {
                  console.error('Error fetching lead:', leadError);
                } else if (data) {
                  // Safely create a Lead object from the data
                  leadData = {
                    id: data.id,
                    name: data.name,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    pipeline_stage_id: data.pipeline_stage_id || null,
                    customer_id: data.customer_id || null,
                    user_id: data.user_id,
                    value: data.value || null,
                    company_name: data.company_name || null,
                    company_address: data.company_address || null,
                    contact_email: data.contact_email || null,
                    contact_phone: data.contact_phone || null,
                    contact_first_name: data.contact_first_name || null
                  };
                }
              }
            }
          }
          
          // Process the lead data if found
          if (leadData) {
            setLead(leadData);
            
            // For demo purposes, we'll use some mock tags
            // In a real app, you'd store tags in a separate table or in metadata
            setTags(['lead', 'follow-up']);
            
            // Calculate days since creation
            const creationDate = new Date(leadData.created_at);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - creationDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysSinceCreation(diffDays);
            
            // If lead has a pipeline_stage_id, select it
            if (leadData.pipeline_stage_id && selectedPipeline?.stages) {
              const stage = selectedPipeline.stages.find(s => s.id === leadData.pipeline_stage_id);
              if (stage) {
                setSelectedStage(stage);
              }
            }
            
            // If lead has customer_id but we don't have customer data yet, fetch it
            if (leadData.customer_id && !customer) {
              const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', leadData.customer_id)
                .maybeSingle();
              
              if (customerError) {
                console.error('Error fetching customer:', customerError);
              } else if (customerData) {
                setCustomer(customerData);
              }
            }
          } else {
            // If no lead exists, create a fake one for demo purposes
            const fakeLead: Lead = {
              id: `LEAD-${selectedConversation.conversation_id.slice(0, 6)}`,
              name: 'New Product Inquiry',
              created_at: selectedConversation.created_at,
              updated_at: selectedConversation.updated_at,
              customer_id: customer?.id || null,
              user_id: selectedConversation.sender_id // Just assign the sender as the user for now
            };
            
            setLead(fakeLead);
            setTags(['new-lead']);
            
            // Calculate days since creation
            const creationDate = new Date(fakeLead.created_at);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - creationDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysSinceCreation(diffDays);
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
      
      // Calculate days since creation
      const creationDate = new Date(mockLead.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysSinceCreation(diffDays);
    }

    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, selectedConversation, selectedPipeline, customer]);

  const selectedProfile = profiles.find(profile => profile.id === selectedAssignee);

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
          } else {
            console.log(`Updated lead ${lead.id} to stage ${stage.name}`);
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
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
  };
  
  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    // For this demo we're just handling tags in local state
    // In a real app, you would delete from a dedicated tags table
    console.log(`Removed tag ${tagToRemove} from lead ${lead.id}`);
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
              Lead #{lead?.id?.slice(0, 6) || '163674'}
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

            {/* Pipeline Section */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Pipeline</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">{selectedStage?.name || 'Incoming leads'}</span>
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
                        onValueChange={setSelectedAssignee}
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
