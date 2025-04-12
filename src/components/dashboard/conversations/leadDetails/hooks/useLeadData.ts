import { useState, useCallback, useEffect } from "react";
import { Lead, Conversation, Profile } from "../../types";
import { fetchLeadById } from "../../api/leadQueries";
import { useCustomerData } from "./useCustomerData";
import { useRealTimeUpdates } from "./useRealTimeUpdates";
import { supabase } from "@/integrations/supabase/client";
import { calculateDaysSinceCreation } from "./utils/leadUtils";

export function useLeadData(
  isExpanded: boolean,
  selectedConversation: Conversation | null,
  profiles: Profile[]
) {
  const [isLoading, setIsLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [daysSinceCreation, setDaysSinceCreation] = useState<number>(0);
  
  const { customer, setCustomer, handleCustomerFetch } = useCustomerData(setLead);
  
  useRealTimeUpdates(isExpanded, lead, selectedConversation?.conversation_id);

  const handleLeadData = useCallback((leadData: Lead) => {
    console.log("Handling lead data:", leadData);
    setLead(leadData);
    
    const daysSinceCreated = calculateDaysSinceCreation(leadData.created_at);
    setDaysSinceCreation(daysSinceCreated);
    
    if (leadData.customer_id) {
      handleCustomerFetch(leadData.customer_id, profiles);
    }
  }, [handleCustomerFetch, profiles]);

  useEffect(() => {
    if (selectedConversation?.conversation_id) {
      setCustomer(null);
      setLead(null);
      setIsLoading(true);
      console.log('Conversation changed in LeadDetailsPanel - resetting state',
        selectedConversation.conversation_id);
    }
  }, [selectedConversation?.conversation_id, setCustomer]);

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
              setLead(null);
              setCustomer(null);
            }
          } else {
            if (selectedConversation.participants && selectedConversation.participants.length > 0) {
              const customerParticipant = selectedConversation.participants.find(p => 
                p.role !== 'admin' && p.external_user_identifier
              );
              
              if (customerParticipant && customerParticipant.external_user_identifier) {
                console.log("Finding lead for customer with phone number:", customerParticipant.external_user_identifier);
                
                // Fetch customer by phone number
                const { data: existingCustomer, error: customerError } = await supabase
                  .from('customers')
                  .select('id')
                  .eq('phone_number', customerParticipant.external_user_identifier)
                  .maybeSingle();
                
                if (customerError) {
                  console.error('Error finding existing customer:', customerError);
                  setLead(null);
                   setCustomer(null);
                 } else if (existingCustomer) {
                   // If customer exists, fetch customer data using the customer ID
                   await handleCustomerFetch(existingCustomer.id, profiles);
                   // Explicitly set lead to null here because the conversation has no lead_id
                   setLead(null); 
                 } else {
                   // If customer does not exist, set lead and customer to null
                   setLead(null);
                  setCustomer(null);
                }
              } else {
                setLead(null);
                setCustomer(null);
              }
            } else {
              setLead(null);
              setCustomer(null);
            }
          }
        } else {
          setLead(null);
          setCustomer(null);
        }
      } catch (error) {
        console.error('Error:', error);
        setLead(null);
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, selectedConversation, handleLeadData, handleCustomerFetch, profiles, setCustomer]);

  return {
    isLoading,
    customer,
    lead,
    daysSinceCreation,
    setLead
  };
}
