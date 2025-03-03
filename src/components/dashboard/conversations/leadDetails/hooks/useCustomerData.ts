
import { useState, useCallback } from "react";
import { Customer, Lead } from "../../types";
import { fetchCustomerById } from "./utils/customerUtils";
import { 
  createFakeLeadFromCustomer, 
  calculateDaysSinceCreation 
} from "./utils/leadUtils";
import { supabase } from "@/integrations/supabase/client";

export function useCustomerData(setLead: React.Dispatch<React.SetStateAction<Lead | null>>) {
  const [customer, setCustomer] = useState<Customer | null>(null);

  const handleCustomerFetch = useCallback(async (customerId: string, profiles: any[]) => {
    const customerData = await fetchCustomerById(customerId);
    
    if (customerData) {
      setCustomer(customerData);
      
      const { data, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();
      
      if (leadError) {
        console.error('Error fetching lead:', leadError);
      } else if (data) {
        // Create a properly typed Lead object with data from both lead and customer
        const leadData: Lead = {
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at || data.created_at,
          user_id: data.user_id,
          pipeline_stage_id: data.pipeline_stage_id || '',
          customer_id: data.customer_id || '',
          value: data.value || 0,
          
          // Virtual properties derived from customer data
          company_name: customerData.company_name || undefined,
          name: customerData.name
        };
        
        console.log("Handling lead data:", leadData);
        setLead(leadData);
        
        return { lead: leadData, customer: customerData };
      } else {
        // Create a fake lead since we have a customer but no lead
        const fakeLead = createFakeLeadFromCustomer(
          customerData, 
          new Date().toISOString(), 
          profiles[0]?.id || 'no-user'
        );
        setLead(fakeLead);
        return { lead: fakeLead, customer: customerData };
      }
    }
    
    return { lead: null, customer: null };
  }, [setLead]);

  return {
    customer,
    setCustomer,
    handleCustomerFetch
  };
}
