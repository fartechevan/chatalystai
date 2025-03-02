
import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Pipeline, PipelineStage, Customer, Lead, Conversation } from "./types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { fetchLeadById, fetchLeadTags, addTagToLead, removeTagFromLead } from "./api/leadQueries";

import {
  LeadHeader,
  LeadTags,
  PipelineSelector,
  LeadContactInfo,
  LeadTabContent
} from "./leadDetails";

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
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [daysSinceCreation, setDaysSinceCreation] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("main");
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      setSelectedStage(null);
      setSelectedPipeline(null);
      setCustomer(null);
      setLead(null);
      setIsLoading(true);
      console.log('Conversation changed in LeadDetailsPanel - resetting state',
        selectedConversation.conversation_id);
    }
  }, [selectedConversation?.conversation_id]);

  useEffect(() => {
    if (!isExpanded) return;

    console.log('Setting up global lead_pipeline realtime subscription');
    const leadPipelineChannel = supabase
      .channel('lead-pipeline-global-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline'
        },
        (payload) => {
          console.log('Lead pipeline change detected:', payload);
          if (lead?.id && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new && payload.new.lead_id === lead.id) {
            console.log('Current lead pipeline was updated, refetching lead data');
            
            const stageId = typeof payload.new === 'object' && 'stage_id' in payload.new ? payload.new.stage_id as string : '';
            findAndSelectStage(stageId);
            
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversation?.conversation_id] 
            });
          }
        }
      )
      .subscribe();

    const leadTagsChannel = supabase
      .channel('lead-tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_tags'
        },
        (payload) => {
          console.log('Lead tags change detected:', payload);
          // Only refresh if it's our current lead
          if (lead?.id && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new && payload.new.lead_id === lead.id) {
            loadLeadTags(lead.id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global lead_pipeline and lead_tags subscriptions');
      supabase.removeChannel(leadPipelineChannel);
      supabase.removeChannel(leadTagsChannel);
    };
  }, [isExpanded, lead?.id, selectedConversation?.conversation_id, queryClient]);

  const loadLeadTags = async (leadId: string) => {
    if (!leadId) return;
    
    setIsTagsLoading(true);
    try {
      const tagNames = await fetchLeadTags(leadId);
      setTags(tagNames);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsTagsLoading(false);
    }
  };

  useEffect(() => {
    if (lead?.id) {
      loadLeadTags(lead.id);
    }
  }, [lead?.id]);

  const findAndSelectStage = useCallback(async (stageId: string) => {
    if (!stageId) return;
    
    console.log("Finding stage:", stageId);

    if (allPipelines.length > 0) {
      for (const pipeline of allPipelines) {
        if (!pipeline.stages) continue;
        
        const stage = pipeline.stages.find(s => s.id === stageId);
        if (stage) {
          console.log("Found stage in existing pipelines:", stage.name);
          setSelectedPipeline(pipeline);
          setSelectedStage(stage);
          return;
        }
      }
    }
    
    try {
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, pipeline_id')
        .eq('id', stageId)
        .maybeSingle();
      
      if (stageError) {
        console.error('Error fetching stage:', stageError);
        return;
      }
      
      if (stageData) {
        console.log("Fetched stage data:", stageData);
        const { data: pipelineData, error: pipelineError } = await supabase
          .from('pipelines')
          .select('*')
          .eq('id', stageData.pipeline_id)
          .maybeSingle();
          
        if (pipelineError) {
          console.error('Error fetching pipeline:', pipelineError);
          return;
        }
        
        if (pipelineData) {
          console.log("Fetched pipeline data:", pipelineData);
          const { data: stagesData, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('id, name, position, pipeline_id')
            .eq('pipeline_id', stageData.pipeline_id)
            .order('position');
          
          if (stagesError) {
            console.error('Error fetching pipeline stages:', stagesError);
            return;
          }
          
          if (stagesData) {
            console.log("Fetched pipeline stages:", stagesData);
            const pipelineWithStages: Pipeline = {
              id: pipelineData.id,
              name: pipelineData.name,
              is_default: pipelineData.is_default,
              stages: stagesData
            };
            
            const stage = stagesData.find(s => s.id === stageId);
            if (stage) {
              console.log("Setting selected stage:", stage.name);
              setSelectedStage(stage);
            }
            
            console.log("Setting selected pipeline:", pipelineData.name);
            setSelectedPipeline(pipelineWithStages);
            
            setAllPipelines(prev => {
              const exists = prev.some(p => p.id === pipelineWithStages.id);
              if (!exists) {
                return [...prev, pipelineWithStages];
              }
              
              return prev.map(p => 
                p.id === pipelineWithStages.id ? pipelineWithStages : p
              );
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stage and pipeline:', error);
    }
  }, [allPipelines]);

  useEffect(() => {
    if (isExpanded) {
      fetchAllPipelines();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      fetchProfiles();
    }
  }, [isExpanded]);

  const fetchCustomerById = useCallback(async (customerId: string): Promise<Customer | null> => {
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
  }, []);

  const handleLeadData = useCallback((leadData: Lead) => {
    console.log("Handling lead data:", leadData);
    setLead(leadData);
    
    const date = new Date(leadData.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysSinceCreation(diffDays);
    
    if (leadData.user_id) {
      setSelectedAssignee(leadData.user_id);
    }
    
    if (leadData.pipeline_stage_id) {
      console.log("Lead has pipeline_stage_id:", leadData.pipeline_stage_id);
      findAndSelectStage(leadData.pipeline_stage_id);
    } else if (selectedPipeline?.stages && selectedPipeline.stages.length > 0) {
      console.log("Setting default stage");
      setSelectedStage(selectedPipeline.stages[0]);
    }
    
    if (leadData.customer_id) {
      fetchCustomerById(leadData.customer_id);
    }
  }, [findAndSelectStage, fetchCustomerById, selectedPipeline]);

  const createFakeLeadFromCustomer = useCallback((customerData: Customer) => {
    if (!selectedConversation) return;
    
    const fakeLead: Lead = {
      id: `${Date.now().toString().slice(-6)}`,
      name: 'New Product Inquiry',
      created_at: selectedConversation.created_at,
      updated_at: selectedConversation.updated_at,
      customer_id: customerData.id,
      user_id: profiles[0]?.id || 'no-user'
    };
    
    setLead(fakeLead);
    setTags(['new-lead']);
    
    const date = new Date(fakeLead.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysSinceCreation(diffDays);
  }, [selectedConversation, profiles]);

  const createMockLeadFromConversation = useCallback(() => {
    if (!selectedConversation) return;
    
    const mockCustomer: Customer = {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      name: selectedConversation.customer_name || 'Unknown Customer',
      phone_number: '+60192698338',
      email: 'customer@example.com'
    };
    
    setCustomer(mockCustomer);
    
    const mockLead: Lead = {
      id: `${Date.now().toString().slice(-6)}`,
      name: 'New Product Inquiry',
      created_at: selectedConversation.created_at,
      updated_at: selectedConversation.updated_at,
      customer_id: mockCustomer.id,
      user_id: profiles[0]?.id || 'mock-user-id'
    };
    
    setLead(mockLead);
    setTags(['mock', 'lead']);
    
    const date = new Date(mockLead.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysSinceCreation(diffDays);
  }, [selectedConversation, profiles]);

  const createMockLeadAndCustomer = useCallback(() => {
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
      user_id: profiles[0]?.id || 'mock-user-id'
    };
    
    setCustomer(mockCustomer);
    setLead(mockLead);
    setTags(['lead', 'product']);
    
    const date = new Date(mockLead.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysSinceCreation(diffDays);
    
    if (profiles.length > 0) {
      setSelectedAssignee(profiles[0].id);
    }
  }, [profiles]);

  const handleCustomerId = useCallback(async (customerId: string) => {
    const customerData = await fetchCustomerById(customerId);
    
    if (customerData) {
      const { data, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();
      
      if (leadError) {
        console.error('Error fetching lead:', leadError);
      } else if (data) {
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
        createFakeLeadFromCustomer(customerData);
      }
    } else {
      createMockLeadAndCustomer();
    }
  }, [fetchCustomerById, handleLeadData, createFakeLeadFromCustomer, createMockLeadAndCustomer]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        if (selectedConversation) {
          console.log("Fetching data for conversation:", selectedConversation.conversation_id);
          if (selectedConversation.lead) {
            handleLeadData(selectedConversation.lead);
          } else if (selectedConversation.lead_id) {
            const leadData = await fetchLeadById(selectedConversation.lead_id);
            if (leadData) {
              handleLeadData(leadData);
            } else {
              createMockLeadFromConversation();
            }
          } else {
            if (selectedConversation.participants && selectedConversation.participants.length > 0) {
              const customerParticipant = selectedConversation.participants.find(p => 
                p.role !== 'admin' && p.external_user_identifier
              );
              
              if (customerParticipant && customerParticipant.external_user_identifier) {
                console.log("Finding lead for customer:", customerParticipant.external_user_identifier);
                await handleCustomerId(customerParticipant.external_user_identifier);
              } else {
                createMockLeadFromConversation();
              }
            } else {
              createMockLeadAndCustomer();
            }
          }
        } else {
          createMockLeadAndCustomer();
        }
      } catch (error) {
        console.error('Error:', error);
        createMockLeadAndCustomer();
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, selectedConversation, handleLeadData, createMockLeadFromConversation, handleCustomerId, createMockLeadAndCustomer]);

  const selectedProfile = profiles.find(profile => profile.id === selectedAssignee);

  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = allPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    setSelectedPipeline(pipeline);
    
    if (pipeline.stages && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0]);
      if (lead?.id) {
        handleStageChange(pipeline.stages[0].id);
      }
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!lead || !selectedPipeline) return;
    
    const stage = selectedPipeline.stages?.find(s => s.id === stageId);
    if (stage) {
      console.log(`Changing stage for lead ${lead.id} to ${stage.name} (${stageId})`);
      
      setSelectedStage(stage);
      
      setLead(prev => {
        if (!prev) return null;
        return {
          ...prev,
          pipeline_stage_id: stageId
        };
      });
      
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
            return;
          }
          
          console.log(`Updated lead ${lead.id} to stage ${stage.name}`);
          
          const { error: pipelineError } = await supabase
            .from('lead_pipeline')
            .update({ stage_id: stageId })
            .eq('lead_id', lead.id);
              
          if (pipelineError) {
            console.error('Error updating lead_pipeline:', pipelineError);
            toast({
              title: "Error",
              description: "Failed to update pipeline stage",
              variant: "destructive"
            });
            return;
          }
          
          queryClient.invalidateQueries({ 
            queryKey: ['lead', selectedConversation?.conversation_id] 
          });
          
          queryClient.invalidateQueries({ 
            queryKey: ['conversations'] 
          });
          
          toast({
            title: "Success",
            description: `Lead moved to "${stage.name}" stage`,
          });
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

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || !lead) return;
    
    try {
      const success = await addTagToLead(lead.id, tag.trim());
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => [...prev, tag.trim()]);
        
        console.log(`Added tag ${tag.trim()} to lead ${lead.id}`);
        
        toast({
          title: "Tag added",
          description: `Added "${tag.trim()}" tag to lead`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add tag",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    
    try {
      const success = await removeTagFromLead(lead.id, tagToRemove);
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
        
        console.log(`Removed tag ${tagToRemove} from lead ${lead.id}`);
        
        toast({
          title: "Tag removed",
          description: `Removed "${tagToRemove}" tag from lead`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove tag",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const fetchAllPipelines = useCallback(async () => {
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
        const pipelinesWithStages = await Promise.all(
          pipelinesData.map(async (pipeline) => {
            const { data: stagesData, error: stagesError } = await supabase
              .from('pipeline_stages')
              .select('id, name, position, pipeline_id')
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
        
        const defaultPipeline = pipelinesWithStages.find(p => p.is_default) || pipelinesWithStages[0];
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline);
          
          if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
            setSelectedStage(defaultPipeline.stages[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
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
  }, []);

  return (
    <div className={cn(
      "border-r bg-background transition-all duration-300 flex flex-col",
      isExpanded ? "w-[320px]" : "w-10"
    )}>
      <LeadHeader 
        isExpanded={isExpanded} 
        onToggle={onToggle} 
        lead={lead} 
        isLoading={isLoading} 
      />

      {isExpanded && (
        <div className="flex-1 overflow-auto flex flex-col">
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
        </div>
      )}
    </div>
  );
}
