
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  ChevronLeft,
  Building,
  Phone,
  Mail,
  User,
  Plus,
  CornerDownRight,
  Edit,
  File,
  DollarSign
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation, Lead } from "./types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createMockLeadFromConversation, handleCustomerId, createMockLeadAndCustomer } from "./utils/leadUtils";

interface LeadDetailsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedConversation: Conversation | null;
}

interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export function LeadDetailsPanel({ isExpanded, onToggle, selectedConversation }: LeadDetailsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    value: '',
    companyName: '',
    companyAddress: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      console.log('Conversation changed in LeadDetailsPanel - resetting state', selectedConversation.conversation_id);
      setIsLoading(true);
      setCurrentStageId(null);
      setCurrentPipelineId(null);
      setLeadData(null);
      fetchLeadAndPipelineData();
    }
  }, [selectedConversation?.conversation_id]);

  const fetchLeadAndPipelineData = async () => {
    if (!selectedConversation) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching data for conversation:', selectedConversation.conversation_id);
      
      // 1. First get the lead data
      const { data: leadData, error: leadError } = await supabase
        .from('conversations')
        .select('lead_id')
        .eq('conversation_id', selectedConversation.conversation_id)
        .single();

      if (leadError && leadError.code !== 'PGRST116') {
        console.error('Error fetching lead_id:', leadError);
        throw leadError;
      }

      if (!leadData?.lead_id) {
        console.log('No lead associated with this conversation');
        setLeadData(null);
        setIsLoading(false);
        return;
      }

      // 2. Fetch the lead data with all necessary details
      const { data: lead, error: leadDetailError } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', leadData.lead_id)
        .single();

      if (leadDetailError) {
        console.error('Error fetching lead details:', leadDetailError);
        throw leadDetailError;
      }

      setLeadData(lead);
      
      // 3. Fetch the pipeline data for this lead
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('lead_pipeline')
        .select('*')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (pipelineError && pipelineError.code !== 'PGRST116') {
        console.error('Error fetching pipeline data:', pipelineError);
      }

      if (pipelineData && pipelineData.stage_id) {
        setCurrentStageId(pipelineData.stage_id);
        setCurrentPipelineId(pipelineData.pipeline_id);
        
        // 4. Fetch all stages for this pipeline
        const { data: stagesData, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipelineData.pipeline_id)
          .order('position');

        if (stagesError) {
          console.error('Error fetching pipeline stages:', stagesError);
        } else {
          setPipelineStages(stagesData || []);
        }
      }
    } catch (error) {
      console.error('Error in fetchLeadAndPipelineData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time subscription to lead_pipeline table
    console.log('Setting up global lead_pipeline realtime subscription');
    const pipelineChannel = supabase
      .channel('lead_pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline'
        },
        (payload) => {
          console.log('Lead pipeline change detected:', payload);
          if (leadData && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new && payload.new.lead_id === leadData.id) {
            console.log('Our lead pipeline changed, refetching data');
            fetchLeadAndPipelineData();
          }
        }
      )
      .subscribe();

    console.log('Setting up global leads realtime subscription');
    const leadsChannel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead table change detected:', payload);
          if (leadData && payload.new && typeof payload.new === 'object' && 'id' in payload.new && payload.new.id === leadData.id) {
            console.log('Our lead changed, refetching data');
            fetchLeadAndPipelineData();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global lead_pipeline subscription');
      supabase.removeChannel(pipelineChannel);
      console.log('Cleaning up global leads subscription');
      supabase.removeChannel(leadsChannel);
    };
  }, [leadData]);

  const handleStageChange = async (direction: 'next' | 'prev') => {
    if (!leadData || !currentStageId || !currentPipelineId || pipelineStages.length === 0) return;
    
    const currentStageIndex = pipelineStages.findIndex(stage => stage.id === currentStageId);
    if (currentStageIndex === -1) return;
    
    let newStageIndex: number;
    if (direction === 'next' && currentStageIndex < pipelineStages.length - 1) {
      newStageIndex = currentStageIndex + 1;
    } else if (direction === 'prev' && currentStageIndex > 0) {
      newStageIndex = currentStageIndex - 1;
    } else {
      return; // Can't move further
    }
    
    const newStage = pipelineStages[newStageIndex];
    
    // Optimistically update UI
    setCurrentStageId(newStage.id);
    
    try {
      // Update lead_pipeline table
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .update({ stage_id: newStage.id })
        .eq('lead_id', leadData.id)
        .eq('pipeline_id', currentPipelineId);
      
      if (pipelineError) throw pipelineError;
      
      // Also update the lead's pipeline_stage_id in the leads table
      const { error: leadError } = await supabase
        .from('leads')
        .update({ pipeline_stage_id: newStage.id })
        .eq('id', leadData.id);
      
      if (leadError) throw leadError;
      
      toast.success(`Lead moved to ${newStage.name}`);
      
      // Refetch data to ensure everything is in sync
      fetchLeadAndPipelineData();
      
    } catch (error) {
      console.error('Error updating lead stage:', error);
      // Revert optimistic update
      setCurrentStageId(currentStageId);
      toast.error('Failed to update lead stage');
    }
  };

  const handleSubmitEditForm = async () => {
    if (!leadData) return;
    
    try {
      const updates: any = {
        name: editFormData.name || leadData.name,
      };
      
      if (editFormData.value) {
        updates.value = parseFloat(editFormData.value);
      }
      
      if (isEditingCompany) {
        updates.company_name = editFormData.companyName;
        updates.company_address = editFormData.companyAddress;
      }
      
      if (isEditingContact) {
        updates.contact_first_name = editFormData.contactName;
        updates.contact_email = editFormData.contactEmail;
        updates.contact_phone = editFormData.contactPhone;
      }
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadData.id);
      
      if (error) throw error;
      
      toast.success('Lead updated successfully');
      setIsEditLeadDialogOpen(false);
      fetchLeadAndPipelineData();
      
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  const handleOpenEditDialog = () => {
    if (!leadData) return;
    
    setEditFormData({
      name: leadData.name || '',
      value: leadData.value ? String(leadData.value) : '',
      companyName: leadData.company_name || '',
      companyAddress: leadData.company_address || '',
      contactName: leadData.contact_first_name || '',
      contactEmail: leadData.contact_email || '',
      contactPhone: leadData.contact_phone || '',
    });
    
    setIsEditingCompany(!!leadData.company_name);
    setIsEditingContact(!!leadData.contact_first_name);
    setIsEditLeadDialogOpen(true);
  };

  const handleCreateLead = async () => {
    if (!selectedConversation) return;
    
    try {
      const lead = await createMockLeadFromConversation(selectedConversation);
      
      if (lead) {
        toast.success('Lead created successfully');
        setIsAddLeadDialogOpen(false);
        fetchLeadAndPipelineData();
      } else {
        toast.error('Failed to create lead');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Failed to create lead');
    }
  };

  const handleCreateCustomerAndLead = async () => {
    if (!selectedConversation || !newCustomerData.name) return;
    
    try {
      const lead = await createMockLeadAndCustomer(
        selectedConversation,
        newCustomerData.name,
        newCustomerData.email || null,
        newCustomerData.phone || null
      );
      
      if (lead) {
        toast.success('Customer and lead created successfully');
        setIsAddLeadDialogOpen(false);
        fetchLeadAndPipelineData();
      } else {
        toast.error('Failed to create customer and lead');
      }
    } catch (error) {
      console.error('Error creating customer and lead:', error);
      toast.error('Failed to create customer and lead');
    }
  };

  // Determine current stage info and adjacent stages
  const currentStage = pipelineStages.find(stage => stage.id === currentStageId);
  const currentStageIndex = currentStage ? pipelineStages.findIndex(stage => stage.id === currentStage.id) : -1;
  const prevStage = currentStageIndex > 0 ? pipelineStages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < pipelineStages.length - 1 ? pipelineStages[currentStageIndex + 1] : null;

  const togglePanel = () => {
    onToggle();
  };

  if (!isExpanded) {
    return (
      <div className="border-l relative flex-col h-full hidden md:flex" style={{ width: '40px' }}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-6 left-1/2 transform -translate-x-1/2 hover:bg-muted"
          onClick={togglePanel}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-l relative w-80 flex-col h-full hidden md:flex">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-6 right-4 hover:bg-muted"
        onClick={togglePanel}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="p-6 pt-14">
        <h3 className="text-lg font-semibold mb-3">Lead Details</h3>
        
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-12 bg-muted/50 animate-pulse rounded"></div>
            <div className="h-20 bg-muted/50 animate-pulse rounded"></div>
            <div className="h-16 bg-muted/50 animate-pulse rounded"></div>
          </div>
        ) : leadData ? (
          <ScrollArea className="h-[calc(100vh-170px)] pr-4">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{leadData.name}</h4>
                  <Button variant="ghost" size="icon" onClick={handleOpenEditDialog}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground mb-1">
                  <div className="flex items-center">
                    <DollarSign className="h-3.5 w-3.5 mr-1 opacity-70" />
                    <span>{leadData.value ? `${leadData.value.toLocaleString()} RM` : 'No value set'}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-2">
                  <div className="flex items-center">
                    <File className="h-3.5 w-3.5 mr-1 opacity-70" />
                    <span>Created {new Date(leadData.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>

              {currentStage && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Pipeline Stage</h4>
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStageChange('prev')}
                      disabled={!prevStage}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {prevStage?.name || 'Back'}
                    </Button>
                    <span className="text-sm font-medium px-3 py-1.5 bg-muted rounded">
                      {currentStage.name}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStageChange('next')}
                      disabled={!nextStage}
                    >
                      {nextStage?.name || 'Forward'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* Company Information */}
              <Card className="p-4">
                <h4 className="font-medium mb-2">Company Information</h4>
                {leadData.company_name ? (
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Building className="h-4 w-4 mr-2 mt-0.5 opacity-70" />
                      <div>
                        <div className="font-medium">{leadData.company_name}</div>
                        {leadData.company_address && (
                          <div className="text-sm text-muted-foreground">
                            {leadData.company_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No company information</div>
                )}
              </Card>

              {/* Contact Information */}
              <Card className="p-4">
                <h4 className="font-medium mb-2">Contact Information</h4>
                {leadData.contact_first_name || leadData.contact_email || leadData.contact_phone ? (
                  <div className="space-y-2">
                    {leadData.contact_first_name && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 opacity-70" />
                        <span>{leadData.contact_first_name}</span>
                      </div>
                    )}
                    {leadData.contact_email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 opacity-70" />
                        <span>{leadData.contact_email}</span>
                      </div>
                    )}
                    {leadData.contact_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 opacity-70" />
                        <span>{leadData.contact_phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No contact information</div>
                )}
              </Card>

              {/* Customer Information */}
              <Card className="p-4">
                <h4 className="font-medium mb-2">Customer Details</h4>
                {leadData.customer ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 opacity-70" />
                      <span>{leadData.customer.name}</span>
                    </div>
                    {leadData.customer.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 opacity-70" />
                        <span>{leadData.customer.email}</span>
                      </div>
                    )}
                    {leadData.customer.phone_number && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 opacity-70" />
                        <span>{leadData.customer.phone_number}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No customer linked</div>
                )}
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 pt-8">
            <div className="text-center text-muted-foreground">
              <p>No lead associated with this conversation</p>
              <p className="text-sm mt-1">Create a lead to track this opportunity</p>
            </div>
            <Button onClick={() => setIsAddLeadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Lead
            </Button>
          </div>
        )}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadDialogOpen} onOpenChange={setIsAddLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lead from Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Quick Create</h3>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={handleCreateLead}
              >
                <CornerDownRight className="h-4 w-4 mr-2" />
                Create lead from conversation
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Create Customer & Lead</h3>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input 
                  id="customerName"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email (optional)</Label>
                <Input 
                  id="customerEmail"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone (optional)</Label>
                <Input 
                  id="customerPhone"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLeadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCustomerAndLead}
              disabled={!newCustomerData.name}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leadName">Lead Name</Label>
              <Input 
                id="leadName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                placeholder="Enter lead name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="leadValue">Value (RM)</Label>
              <Input 
                id="leadValue"
                type="number"
                value={editFormData.value}
                onChange={(e) => setEditFormData({...editFormData, value: e.target.value})}
                placeholder="Enter lead value"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <h3 className="text-sm font-medium">Company Information</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditingCompany(!isEditingCompany)}
              >
                {isEditingCompany ? 'Hide' : 'Edit'}
              </Button>
            </div>
            
            {isEditingCompany && (
              <div className="space-y-4 pl-2 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName"
                    value={editFormData.companyName}
                    onChange={(e) => setEditFormData({...editFormData, companyName: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea 
                    id="companyAddress"
                    value={editFormData.companyAddress}
                    onChange={(e) => setEditFormData({...editFormData, companyAddress: e.target.value})}
                    placeholder="Enter company address"
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <h3 className="text-sm font-medium">Contact Information</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditingContact(!isEditingContact)}
              >
                {isEditingContact ? 'Hide' : 'Edit'}
              </Button>
            </div>
            
            {isEditingContact && (
              <div className="space-y-4 pl-2 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input 
                    id="contactName"
                    value={editFormData.contactName}
                    onChange={(e) => setEditFormData({...editFormData, contactName: e.target.value})}
                    placeholder="Enter contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input 
                    id="contactEmail"
                    type="email"
                    value={editFormData.contactEmail}
                    onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input 
                    id="contactPhone"
                    value={editFormData.contactPhone}
                    onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLeadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEditForm}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
