
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Customer, Lead, Conversation, Profile } from "../../types";
import { fetchLeadById } from "../../api/leadQueries";
import { useQueryClient } from "@tanstack/react-query";

export function useLeadData(
  isExpanded: boolean,
  selectedConversation: Conversation | null,
  profiles: Profile[]
) {
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [daysSinceCreation, setDaysSinceCreation] = useState<number>(0);
  const queryClient = useQueryClient();

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
    
    if (leadData.customer_id) {
      fetchCustomerById(leadData.customer_id);
    }
  }, [fetchCustomerById]);

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
    
    const date = new Date(mockLead.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysSinceCreation(diffDays);
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
        // Create a properly typed Lead object
        const leadData: Lead = {
          id: data.id,
          name: data.name || null, // These fields might not exist in the database
          created_at: data.created_at,
          updated_at: data.updated_at || undefined,
          user_id: data.user_id,
          pipeline_stage_id: data.pipeline_stage_id || null,
          customer_id: data.customer_id || null,
          value: data.value || null,
          company_name: data.company_name || null,
          company_address: data.company_address || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          contact_first_name: data.contact_first_name || null
        };
        handleLeadData(leadData);
      } else {
        createFakeLeadFromCustomer(customerData);
      }
    } else {
      createMockLeadAndCustomer();
    }
  }, [fetchCustomerById, handleLeadData, createFakeLeadFromCustomer, createMockLeadAndCustomer]);

  // Set up a useEffect to reset state when conversation changes
  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      setCustomer(null);
      setLead(null);
      setIsLoading(true);
      console.log('Conversation changed in LeadDetailsPanel - resetting state',
        selectedConversation.conversation_id);
    }
  }, [selectedConversation?.conversation_id]);

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

  // Set up global lead_pipeline realtime subscription
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
            
            queryClient.invalidateQueries({ 
              queryKey: ['lead', selectedConversation?.conversation_id] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global lead_pipeline subscription');
      supabase.removeChannel(leadPipelineChannel);
    };
  }, [isExpanded, lead?.id, selectedConversation?.conversation_id, queryClient]);

  return {
    isLoading,
    customer,
    lead,
    daysSinceCreation,
    setLead
  };
}
